declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module '*.webp' {
  const value: string;
  export default value;
}

declare module '*.css?url' {
  const href: string
  export default href
}

declare module "https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.mjs?no-dts" {
  export const GlobalWorkerOptions: {
    workerSrc: string;
  };

  export function getDocument(params: any): {
    promise: Promise<{
      numPages: number;
      getPage: (pageNumber: number) => Promise<{
        getTextContent: () => Promise<{ items: any[] }>;
      }>;
    }>;
  };
}