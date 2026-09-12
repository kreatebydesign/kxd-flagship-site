import styles from "./journal-feature.module.css";

type JournalCodeProps = {
  filePath: string;
  code: string;
  language?: string;
  caption?: string;
};

export function JournalCode({ filePath, code, language = "ts", caption }: JournalCodeProps) {
  return (
    <figure className={styles.figure}>
      <div className={styles.codeShell}>
        <div className={styles.codeHeader}>
          <span>{filePath}</span>
          <span>{language}</span>
        </div>
        <pre className={styles.codePre}>
          <code>{code}</code>
        </pre>
      </div>
      {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
    </figure>
  );
}
