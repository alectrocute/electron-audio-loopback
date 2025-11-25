import { app, session as sessionModule, desktopCapturer, ipcMain } from 'electron';
import { type DesktopCapturerSource } from 'electron/main';
import * as os from 'os';
import { buildFeatureFlags, ipcEvents, defaultSourcesOptions, featureSwitchKey, loopbackAudioTypes } from './config.js';
import { type InitMainOptions } from './types.js';

/**
 * Checks if Core Audio Taps are available on the current macOS version.
 * Core Audio Taps are available on macOS 14.2+ and should be preferred over
 * ScreenCaptureKit because ScreenCaptureKit can interfere with system keyboard
 * shortcuts and global hotkeys (e.g., Raycast).
 *
 * Darwin kernel version mapping:
 * - macOS 15.x = Darwin 24.x
 * - macOS 14.x = Darwin 23.x
 * - macOS 13.x = Darwin 22.x
 * - macOS 12.x = Darwin 21.x
 */
const shouldUseCoreAudioTaps = (): boolean => {
    if (process.platform !== 'darwin') {
        return false;
    }

    try {
        const release = os.release();
        const [majorStr, minorStr] = release.split('.');
        const major = parseInt(majorStr, 10);
        const minor = parseInt(minorStr, 10);

        // Core Audio Taps available on macOS 14.2+ (Darwin 23.2+)
        // We use this by default to avoid ScreenCaptureKit's keyboard shortcut issues
        if (major > 23) {
            return true; // macOS 15+
        }
        if (major === 23 && minor >= 2) {
            return true; // macOS 14.2+
        }
        return false;
    } catch {
        return false;
    }
};

export const initMain = (options: InitMainOptions = {}): void => {
    const {
        forceCoreAudioTap,
        loopbackWithMute = false,
        onAfterGetSources,
        sessionOverride,
        sourcesOptions = defaultSourcesOptions,
    } = options;

    // Use Core Audio Taps by default on macOS 14.2+ to avoid ScreenCaptureKit's
    // interference with system keyboard shortcuts (Raycast, global hotkeys, etc.)
    const useCoreAudioTap = forceCoreAudioTap ?? shouldUseCoreAudioTaps();

    // Get other enabled features from the command line.
    const otherEnabledFeatures = app.commandLine.getSwitchValue(featureSwitchKey)?.split(',');

    // Remove the switch if it exists.
    if (app.commandLine.hasSwitch(featureSwitchKey)) {
        app.commandLine.removeSwitch(featureSwitchKey);
    }

    // Add the feature flags to the command line with any other user-enabled features concatenated.
    const currentFeatureFlags = buildFeatureFlags({
        otherEnabledFeatures,
        forceCoreAudioTap: useCoreAudioTap,
    });

    app.commandLine.appendSwitch(featureSwitchKey, currentFeatureFlags);

    // Handle the enable loopback audio event.
    ipcMain.handle(ipcEvents.enableLoopbackAudio, () => {
        const session = sessionOverride || sessionModule.defaultSession;

        session.setDisplayMediaRequestHandler(async (_, callback) => {
            let sources: DesktopCapturerSource[];

            try {
                sources = await desktopCapturer.getSources(sourcesOptions);

                // If the developer needs to transform the sources and return a single-item array,
                // they can do so by passing a function to the `onAfterGetSources` option.
                // Likely this will be unused, but who knows?!
                if (onAfterGetSources) {
                    sources = onAfterGetSources(sources);
                }
            } catch {
                throw new Error(`Failed to get sources for system audio loopback capture.`);
            }

            if (sources.length === 0) {
                throw new Error(`No sources found for system audio loopback capture.`);
            }

            callback({
                video: sources[0],
                audio: loopbackWithMute ? loopbackAudioTypes.loopbackWithMute : loopbackAudioTypes.loopback,
            });
        });
    });

    // Handle the disable loopback audio event.
    ipcMain.handle(ipcEvents.disableLoopbackAudio, () => {
        const session = sessionOverride || sessionModule.defaultSession;
        session.setDisplayMediaRequestHandler(null);
    });
}
