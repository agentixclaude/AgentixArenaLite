// One-line privacy note shown in each page header.
export default function DeviceNote() {
  return (
    <div className="device-note">
      <span className="dot" aria-hidden="true" />
      <b>Runs on your device</b>
      <span className="dn-sep" aria-hidden="true">·</span>
      <span>Your video never leaves this computer</span>
      <span className="dn-sep dn-x" aria-hidden="true">·</span>
      <span className="dn-x">Best in Chrome or Edge on desktop</span>
    </div>
  );
}
