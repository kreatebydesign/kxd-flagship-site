export function WebsiteEditorPortalAction({ url }: { url: string }) {
  return (
    <section className="kxd-active-engagement" aria-labelledby="website-editor-title">
      <p className="kxd-active-engagement__eyebrow">Your website</p>
      <h2 id="website-editor-title" className="kxd-active-engagement__title">
        Website Editor
      </h2>
      <p className="kxd-active-engagement__included">
        Manage your website, bands, media and content.
      </p>
      <p className="kxd-active-engagement__included">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="kxd-ces-btn kxd-ces-btn--primary"
        >
          Open Website Editor ↗
        </a>
      </p>
    </section>
  );
}
