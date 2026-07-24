/**
 * Flash-prevention boot script for authenticated KXD OS / portal html shells.
 * Must run before paint; keeps preference device-local (cookie + localStorage).
 */
export function ThemeBootScript() {
  return (
    <script
      id="kxd-theme-boot"
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var k="kxd-theme";var c="kxd-theme";var pref="system";var m=document.cookie.match(new RegExp("(?:^|; )"+c+"=([^;]*)"));if(m){try{pref=decodeURIComponent(m[1]);}catch(e){}}try{var ls=localStorage.getItem(k);if(ls==="light"||ls==="dark"||ls==="system")pref=ls;}catch(e){}if(pref!=="light"&&pref!=="dark"&&pref!=="system")pref="system";var resolved=pref==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):pref;document.documentElement.setAttribute("data-theme",resolved);document.documentElement.style.colorScheme=resolved;}catch(e){}})();`,
      }}
    />
  );
}
