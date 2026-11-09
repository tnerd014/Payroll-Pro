package android.print;

import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;

public class PdfPrintHelper {
    public interface Callback {
        void onSuccess(byte[] pdfBytes);
        void onError(Exception error);
    }

    public static void printAdapterToFile(
            final PrintDocumentAdapter adapter,
            final PrintAttributes attributes,
            final File tempPdfFile,
            final Callback callback
    ) {
        try {
            final ParcelFileDescriptor pfd = ParcelFileDescriptor.open(
                    tempPdfFile,
                    ParcelFileDescriptor.MODE_READ_WRITE
            );

            adapter.onLayout(
                    null,
                    attributes,
                    new CancellationSignal(),
                    new PrintDocumentAdapter.LayoutResultCallback() {
                        @Override
                        public void onLayoutFinished(PrintDocumentInfo info, boolean changed) {
                            adapter.onWrite(
                                    new PageRange[]{PageRange.ALL_PAGES},
                                    pfd,
                                    new CancellationSignal(),
                                    new PrintDocumentAdapter.WriteResultCallback() {
                                        @Override
                                        public void onWriteFinished(PageRange[] pages) {
                                            try {
                                                pfd.close();
                                                byte[] pdfBytes = readFileToBytes(tempPdfFile);
                                                tempPdfFile.delete();
                                                callback.onSuccess(pdfBytes);
                                            } catch (Exception e) {
                                                callback.onError(e);
                                            }
                                        }

                                        @Override
                                        public void onWriteFailed(CharSequence error) {
                                            try { pfd.close(); } catch (Exception ignored) {}
                                            tempPdfFile.delete();
                                            callback.onError(new Exception(error != null ? error.toString() : "PDF write failed"));
                                        }

                                        @Override
                                        public void onWriteCancelled() {
                                            try { pfd.close(); } catch (Exception ignored) {}
                                            tempPdfFile.delete();
                                            callback.onError(new Exception("PDF write cancelled"));
                                        }
                                    }
                            );
                        }

                        @Override
                        public void onLayoutFailed(CharSequence error) {
                            try { pfd.close(); } catch (Exception ignored) {}
                            tempPdfFile.delete();
                            callback.onError(new Exception(error != null ? error.toString() : "PDF layout failed"));
                        }

                        @Override
                        public void onLayoutCancelled() {
                            try { pfd.close(); } catch (Exception ignored) {}
                            tempPdfFile.delete();
                            callback.onError(new Exception("PDF layout cancelled"));
                        }
                    },
                    null
            );
        } catch (Exception e) {
            callback.onError(e);
        }
    }

    private static byte[] readFileToBytes(File file) throws Exception {
        FileInputStream fis = new FileInputStream(file);
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int read;
        while ((read = fis.read(buffer)) != -1) {
            bos.write(buffer, 0, read);
        }
        fis.close();
        return bos.toByteArray();
    }
}

