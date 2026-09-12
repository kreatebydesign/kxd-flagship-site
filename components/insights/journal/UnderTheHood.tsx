import styles from "./journal-feature.module.css";

type UnderTheHoodProps = {
  index: string;
  title: string;
  businessProblem: string;
  explanation: string[];
  flow?: string[];
  filePath?: string;
  code?: {
    language?: string;
    code: string;
  };
};

export function UnderTheHood({
  index,
  title,
  businessProblem,
  explanation,
  flow,
  filePath,
  code,
}: UnderTheHoodProps) {
  return (
    <aside className={styles.underHood} aria-label={`Under the hood ${index}: ${title}`}>
      <p className={`kxd-label ${styles.underHoodIndex}`}>Under the Hood / {index}</p>
      <h3 className={`font-serif ${styles.underHoodTitle}`}>{title}</h3>

      <p className={styles.underHoodLabel}>Business problem</p>
      <p className={styles.underHoodProblem}>{businessProblem}</p>

      {flow && flow.length > 0 ? (
        <>
          <p className={styles.underHoodLabel}>Flow</p>
          <ol className={styles.flow}>
            {flow.map((step) => (
              <li key={step} className={styles.flowItem}>
                {step}
              </li>
            ))}
          </ol>
        </>
      ) : null}

      <div className={styles.underHoodExplain}>
        {explanation.map((paragraph) => (
          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
        ))}
      </div>

      {filePath ? <p className={styles.filePath}>{filePath}</p> : null}

      {code ? (
        <div className={styles.codeShell}>
          <div className={styles.codeHeader}>
            <span>{filePath || "excerpt"}</span>
            <span>{code.language || "code"}</span>
          </div>
          <pre className={styles.codePre}>
            <code>{code.code}</code>
          </pre>
        </div>
      ) : null}
    </aside>
  );
}
