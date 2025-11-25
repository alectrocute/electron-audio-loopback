import { SourcesOptions, type DesktopCapturerSource, type Session } from 'electron/main';

export interface InitMainOptions {
    sourcesOptions?: SourcesOptions;
    onAfterGetSources?: (sources: DesktopCapturerSource[]) => DesktopCapturerSource[];
    /**
     * Force the use of Core Audio Taps instead of ScreenCaptureKit for audio loopback.
     * On macOS 15.0+, this is automatically enabled by default as ScreenCaptureKit has
     * known issues that can affect system keyboard shortcuts and global hotkeys.
     * @default Auto-detected based on macOS version (true on macOS 15+, false otherwise)
     */
    forceCoreAudioTap?: boolean;
    loopbackWithMute?: boolean;
    sessionOverride?: Session;
    /**
     * Skip modifying Chromium feature flags entirely.
     * Use this option if you don't need audio loopback functionality or if you're
     * experiencing issues with system keyboard shortcuts (e.g., Raycast, global hotkeys).
     * When true, only the IPC handlers will be registered without any feature flag changes.
     * @default false
     */
    skipFeatureFlags?: boolean;
    /**
     * Skip registering IPC handlers.
     * Use this if you only want to apply the feature flags but handle IPC communication yourself.
     * @default false
     */
    skipIpcHandlers?: boolean;
}

export interface GetLoopbackAudioMediaStreamOptions {
    removeVideo?: boolean;
}
