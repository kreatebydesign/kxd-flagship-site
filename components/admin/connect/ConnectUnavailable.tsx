/**
 * Safe Connect unavailable view — no conversation data, no existence leaks.
 */
export function ConnectUnavailable() {
  return (
    <main className="kxd-connect kxd-connect__unavailable">
      <div>
        <p className="kxd-connect__eyebrow">KXD Connect</p>
        <h1>Unavailable</h1>
        <p>
          Connect is not available for this account right now. If you believe
          this is unexpected, contact a platform operator.
        </p>
      </div>
    </main>
  );
}
