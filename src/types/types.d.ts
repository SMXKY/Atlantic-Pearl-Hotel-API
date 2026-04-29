declare module "pdfmake/src/printer" {
  const PdfPrinter: any;
  export default PdfPrinter;
}

declare module "pdfmake/build/vfs_fonts" {
  const vfsFonts: {
    pdfMake: {
      vfs: Record<string, string>;
    };
  };
  export default vfsFonts;
}
