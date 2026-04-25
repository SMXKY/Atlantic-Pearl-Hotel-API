declare module "pdfmake/src/printer" {
  export default class PdfPrinter {
    constructor(fontDescriptors: any);
    createPdfKitDocument(docDefinition: any, options?: any): any;
  }
}

declare module "pdfmake/build/vfs_fonts" {
  const vfsFonts: {
    pdfMake: {
      vfs: Record<string, string>;
    };
  };
  export default vfsFonts;
}
