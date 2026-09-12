import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatInsightDate } from "@/lib/insights";
import type { JournalBlock, JournalFeatureArticle } from "@/lib/insights/journal-blocks";
import { JournalCode } from "./JournalCode";
import { JournalFigure } from "./JournalFigure";
import { PlateArchitectureDiagram } from "./PlateArchitectureDiagram";
import { UnderTheHood } from "./UnderTheHood";
import styles from "./journal-feature.module.css";

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re =
    /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((?:\/[^)]+|https?:\/\/[^)]+)\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      parts.push(<code key={key++}>{token.slice(1, -1)}</code>);
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\((.+)\)$/);
      if (linkMatch) {
        const href = linkMatch[2];
        const external = href.startsWith("http");
        parts.push(
          <Link
            key={key++}
            href={href}
            {...(external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {linkMatch[1]}
          </Link>,
        );
      }
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function BlockRenderer({ block }: { block: JournalBlock }) {
  switch (block.type) {
    case "prose":
      return (
        <div className={`${styles.prose} ${styles.proseMeasure}`}>
          {block.paragraphs.map((p) => (
            <p key={p.slice(0, 64)}>{renderInline(p)}</p>
          ))}
        </div>
      );
    case "heading":
      if (block.level === 3) {
        return <h3 className={`font-serif ${styles.subHeading}`}>{block.text}</h3>;
      }
      return <h2 className={`font-serif ${styles.sectionHeading}`}>{block.text}</h2>;
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={styles.list}>
          {block.items.map((item) => (
            <li key={item}>{renderInline(item)}</li>
          ))}
        </Tag>
      );
    }
    case "figure":
      return (
        <JournalFigure
          src={block.src}
          alt={block.alt}
          caption={block.caption}
          wide={block.layout === "wide" || block.layout === "full"}
        />
      );
    case "code":
      return (
        <JournalCode
          filePath={block.filePath}
          code={block.code}
          language={block.language}
          caption={block.caption}
        />
      );
    case "under-the-hood":
      return (
        <UnderTheHood
          index={block.index}
          title={block.title}
          businessProblem={block.businessProblem}
          explanation={block.explanation}
          flow={block.flow}
          filePath={block.filePath}
          code={block.code}
        />
      );
    case "diagram":
      return <PlateArchitectureDiagram caption={block.caption} />;
    case "split":
      return (
        <div className={styles.split}>
          <div>
            {block.eyebrow ? (
              <p className={`kxd-label ${styles.splitEyebrow}`}>{block.eyebrow}</p>
            ) : null}
            {block.title ? (
              <h3 className={`font-serif ${styles.splitTitle}`}>{block.title}</h3>
            ) : null}
            <div className={styles.prose}>
              {block.body.map((p) => (
                <p key={p.slice(0, 48)}>{renderInline(p)}</p>
              ))}
            </div>
          </div>
          <JournalFigure
            src={block.figure.src}
            alt={block.figure.alt}
            caption={block.figure.caption}
          />
        </div>
      );
    default:
      return null;
  }
}

export function JournalFeatureArticleView({
  article,
}: {
  article: JournalFeatureArticle;
}) {
  const publishedDate = formatInsightDate(article.publishedAt);
  const initials = article.author
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  return (
    <article className={styles.feature}>
      <header className={styles.hero}>
        <div className="kxd-container">
          <div className={styles.heroGrid}>
            <div>
              <Link href="/insights" className={`kxd-label ${styles.backLink}`}>
                <span aria-hidden style={{ color: "var(--kxd-gold)" }}>
                  ←
                </span>
                KXD Journal
              </Link>

              <div className={styles.metaRow}>
                <p className={`kxd-label ${styles.chip}`}>{article.editorialLabel}</p>
                <p className={`kxd-label ${styles.chip}`}>{article.categoryLabel}</p>
                <span className={styles.subject}>{article.subjectLabel}</span>
                <span className={styles.subject}>{article.readingTime} min read</span>
              </div>

              <h1 className={`kxd-serif-title ${styles.h1}`}>{article.title}</h1>
              <p className={styles.deck}>{article.excerpt}</p>

              <div className={styles.byline}>
                <div className={styles.avatar} aria-hidden>
                  {initials}
                </div>
                <div>
                  <p
                    className="font-sans"
                    style={{
                      fontSize: "0.6875rem",
                      letterSpacing: "0.08em",
                      color: "var(--kxd-cream)",
                    }}
                  >
                    {article.author} · Kreate by Design
                  </p>
                  <p
                    className="mt-0.5 font-sans"
                    style={{
                      fontSize: "0.625rem",
                      letterSpacing: "0.06em",
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
                    {publishedDate}
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.heroMedia}>
              <Image
                src={article.heroImage.src}
                alt={article.heroImage.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 48vw"
                style={{ objectFit: "cover" }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className={styles.body}>
        <div className="kxd-container">
          <div className={styles.stack}>
            {article.blocks.map((block, index) => (
              <BlockRenderer key={`${block.type}-${index}`} block={block} />
            ))}
          </div>

          <div className={styles.close}>
            <p className={styles.closeMeta}>
              {article.author} · Kreate by Design · {publishedDate}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
