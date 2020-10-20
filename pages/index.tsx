import { GetServerSideProps } from "next";
import { File, listFilesInZip } from "../src/unzip";
import { validateUrl } from "../src/validateUrl";
import { useRef } from "react";
import { useRouter } from "next/router";

type Props =
  | {
      state: "errorReading";
      message: string;
      archive: string;
    }
  | {
      state: "listFiles";
      archive: string;
      files: File[];
    }
  | {
      state: "home";
    };

export default function Home(props: Props): NonNullable<React.ReactNode> {
  const textInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  return (
    <div>
      See files in zips
      <form
        action="/"
        onSubmit={(e) => {
          e.preventDefault();
          if (!textInputRef.current) return;
          const archive = encodeURIComponent(textInputRef.current.value.trim());
          router.push(`/?archive=${archive}`);
        }}
      >
        <input
          name="archive"
          ref={textInputRef}
          type="url"
          defaultValue={
            props.state === "listFiles"
              ? props.archive
              : props.state === "errorReading"
              ? props.archive
              : ""
          }
          placeholder="https://example.com/file.zip"
        />
      </form>
      {props.state === "errorReading" && (
        <>
          <h1>An error occured</h1>
          <p>{props.message}</p>
        </>
      )}
      {props.state === "listFiles" && (
        <>
          <h1>
            Files in <code>{props.archive}</code>
          </h1>
          <ul>
            {props.files
              .filter((f) => f.type === "File")
              .map((file) => {
                const path = encodeURIComponent(file.fileName);
                const archive = encodeURIComponent(props.archive);
                return (
                  <li key={file.fileName}>
                    <a href={`/api/unzip?path=${path}&archive=${archive}`}>
                      <code>{file.fileName}</code>
                    </a>
                  </li>
                );
              })}
          </ul>
        </>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const { archive } = ctx.query;

  if (archive) {
    if (typeof archive !== "string") {
      throw new Error("archive must be a string");
    }

    validateUrl(archive);
    ctx.res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
    try {
      const files = await listFilesInZip(archive);

      return {
        props: {
          state: "listFiles",
          archive,
          files,
        },
      };
    } catch (e) {
      return {
        props: {
          state: "errorReading",
          archive,
          message: e.message,
        },
      };
    }
  }

  return {
    props: {
      state: "home",
    },
  };
};
