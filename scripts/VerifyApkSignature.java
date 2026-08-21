import com.android.apksig.ApkVerifier;

import java.io.File;
import java.security.MessageDigest;
import java.security.cert.X509Certificate;
import java.util.HexFormat;

final class VerifyApkSignature {
    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            throw new IllegalArgumentException("Usage: VerifyApkSignature <apk>");
        }

        ApkVerifier.Result result = new ApkVerifier.Builder(new File(args[0])).build().verify();
        System.out.printf(
            "verified=%s v1=%s v2=%s v3=%s v4=%s errors=%d warnings=%d%n",
            result.isVerified(),
            result.isVerifiedUsingV1Scheme(),
            result.isVerifiedUsingV2Scheme(),
            result.isVerifiedUsingV3Scheme(),
            result.isVerifiedUsingV4Scheme(),
            result.getErrors().size(),
            result.getWarnings().size()
        );

        for (X509Certificate certificate : result.getSignerCertificates()) {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(certificate.getEncoded());
            System.out.println("subject=" + certificate.getSubjectX500Principal());
            System.out.println("certificateSha256=" + HexFormat.of().formatHex(digest));
        }

        if (!result.isVerified() || !result.getErrors().isEmpty()) {
            throw new IllegalStateException("APK signature verification failed: " + result.getErrors());
        }
    }
}
