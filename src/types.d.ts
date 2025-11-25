import { SourcesOptions, type DesktopCapturerSource, type Session } from 'electron/main';

export interface InitMainOptions {
    sourcesOptions?: SourcesOptions;
    onAfterGetSources?: (sources: DesktopCapturerSource[]) => DesktopCapturerSource[];
    /**
     * Force the use of Core Audio Taps instead of ScreenCaptureKit for audio loopback.
     * On macOS 14.2+, Core Audio Taps are used by default because ScreenCaptureKit
     * can interfere with system keyboard shortcuts and global hotkeys (e.g., Raycast).
     * Set to `false` to force ScreenCaptureKit on supported macOS versions.
     * @default Auto-detected (true on macOS 14.2+, false on older versions)
     */
    forceCoreAudioTap?: boolean;
    loopbackWithMute?: boolean;
    sessionOverride?: Session;
}

export interface GetLoopbackAudioMediaStreamOptions {
    removeVideo?: boolean;
}
