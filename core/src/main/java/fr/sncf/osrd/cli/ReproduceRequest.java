package fr.sncf.osrd.cli;

import static fr.sncf.osrd.api.api_v2.stdcm.STDCMRequestV2Kt.getStdcmRequestAdapter;

import com.beust.jcommander.Parameter;
import com.beust.jcommander.Parameters;
import fr.sncf.osrd.api.InfraManager;
import fr.sncf.osrd.api.api_v2.stdcm.STDCMEndpointV2;
import fr.sncf.osrd.utils.jacoco.ExcludeFromGeneratedCodeCoverage;
import java.io.IOException;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okio.Okio;

@Parameters(commandDescription = "Debug tool to reproduce a request based on a payload json file")
public class ReproduceRequest implements CliCommand {

    @Parameter(
            names = {"--stdcm-payload-path"},
            description = "Path to the json payload file to load")
    private String payloadPath = "stdcm-payload.json";

    @Parameter(
            names = {"--editoast-url"},
            description = "The base URL of editoast (used to query infrastructures)")
    private String editoastUrl = "http://localhost:8090/";

    @Parameter(
            names = {"--editoast-authorization"},
            description = "The HTTP Authorization header sent to editoast")
    private String editoastAuthorization = "x-osrd-skip-authz";

    @Override
    @ExcludeFromGeneratedCodeCoverage
    public int run() {
        try {
            var fileSource = Okio.source(Path.of(payloadPath));
            var bufferedSource = Okio.buffer(fileSource);
            var request = getStdcmRequestAdapter().fromJson(bufferedSource);
            assert request != null;

            var httpClient = new OkHttpClient.Builder()
                    .readTimeout(120, TimeUnit.SECONDS)
                    .build();
            var infraManager = new InfraManager(editoastUrl, editoastAuthorization, httpClient);

            new STDCMEndpointV2(infraManager).run(request);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        return 0;
    }
}
