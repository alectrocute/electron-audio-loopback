import { app, session as sessionModule, desktopCapturer, ipcMain } from 'electron';
import { type DesktopCapturerSource } from 'electron/main';
import * as os from 'os';
import { buildFeatureFlags, ipcEvents, defaultSourcesOptions, featureSwitchKey, loopbackAudioTypes } from './config.js';
import { type InitMainOptions } from './types.js';

/**
 * Checks if the current macOS version is 15.0 or higher.
 * On macOS 15+, ScreenCaptureKit has known issues that can affect system keyboard shortcuts
 * and global hotkeys (e.g., Raycast), so Core Audio Taps should be used instead.
 */
const isMacOS15OrHigher = (): boolean => {
    if (process.platform !== 'darwin') {
        return false;
    }

    try {
        const release = os.release();
        // macOS version = Darwin kernel version - 9
        // macOS 15 = Darwin 24.x.x
        const majorVersion = parseInt(release.split('.')[0], 10);
        return majorVersion >= 24;
    } catch {
        return false;
    }
};

export const initMain = (options: InitMainOptions = {}): void => {
    // Auto-detect if we should use Core Audio Taps on macOS 15+
    // ScreenCaptureKit on macOS 15+ has known issues that can affect system keyboard shortcuts
    const shouldUseCoreAudioTap = options.forceCoreAudioTap ?? isMacOS15OrHigher();

    const {
        loopbackWithMute = false,
        onAfterGetSources,
        sessionOverride,
        sourcesOptions = defaultSourcesOptions,
        skipFeatureFlags = false,
        skipIpcHandlers = false,
    } = options;

    // Only modify feature flags if not explicitly skipped
    if (!skipFeatureFlags) {
        // Get other enabled features from the command line.
        const otherEnabledFeatures = app.commandLine.getSwitchValue(featureSwitchKey)?.split(',');

        // Remove the switch if it exists.
        if (app.commandLine.hasSwitch(featureSwitchKey)) {
            app.commandLine.removeSwitch(featureSwitchKey);
        }

        // Add the feature flags to the command line with any other user-enabled features concatenated.
        const currentFeatureFlags = buildFeatureFlags({
            otherEnabledFeatures,
            forceCoreAudioTap: shouldUseCoreAudioTap,
        });

        app.commandLine.appendSwitch(featureSwitchKey, currentFeatureFlags);
    }

    // Skip IPC handler registration if requested
    if (skipIpcHandlers) {
        return;
    }

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
