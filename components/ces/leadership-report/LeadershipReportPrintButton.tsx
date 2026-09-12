"use client";

export function LeadershipReportPrintButton() {
  return (
    <button
      type="button"
      className="kxd-lead-report__print"
      onClick={() => {
        const previousTitle = document.title;
        document.title =
          "Primal Motorsports | Digital Performance & Growth Report";
        const restore = () => {
          document.title = previousTitle;
          window.removeEventListener("afterprint", restore);
        };
        window.addEventListener("afterprint", restore);
        window.print();
      }}
    >
      Print / Save PDF
    </button>
  );
}
