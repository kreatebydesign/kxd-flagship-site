import Image from "next/image";
import styles from "./journal-feature.module.css";

type JournalFigureProps = {
  src: string;
  alt: string;
  caption?: string;
  priority?: boolean;
  wide?: boolean;
};

export function JournalFigure({
  src,
  alt,
  caption,
  priority = false,
  wide = false,
}: JournalFigureProps) {
  return (
    <figure className={`${styles.figure} ${wide ? styles.figureWide : ""}`}>
      <div className={styles.figureFrame}>
        <Image
          src={src}
          alt={alt}
          width={1600}
          height={1000}
          sizes="(max-width: 900px) 100vw, 1100px"
          priority={priority}
          style={{ width: "100%", height: "auto" }}
        />
      </div>
      {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
    </figure>
  );
}
