// Manual mock for e2e tests: puppeteer's real package is deep-ESM and not
// worth transforming, and e2e tests shouldn't spin up a real headless
// browser anyway. PdfGeneratorService.getBrowser()/generatePdf() are the
// only call sites; nothing in the current e2e suite exercises them.
module.exports = {
  launch: async () => ({
    connected: true,
    newPage: async () => ({
      setContent: async () => {},
      pdf: async () => Buffer.from(''),
      close: async () => {},
    }),
    close: async () => {},
  }),
};
