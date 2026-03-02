package mx.traxo.infraestructura.cliente;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class TurnstileService {

    private static final Logger log = LoggerFactory.getLogger(TurnstileService.class);
    private static final String VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    @Value("${turnstile.secret-key:}")
    private String secretKey;

    private final WebClient webClient;

    public TurnstileService(WebClient.Builder builder) {
        this.webClient = builder.baseUrl(VERIFY_URL).build();
    }

    public boolean verificar(String token) {
        if (secretKey == null || secretKey.isBlank()) {
            log.debug("Lla ve secreta de Turnstile no configurada, verificación omitida");
            return true;
        }
        if (token == null || token.isBlank()) {
            return false;
        }
        try {
            TurnstileResponse resp = webClient.post()
                    .uri("")
                    .bodyValue(new TurnstileRequest(secretKey, token))
                    .retrieve()
                    .bodyToMono(TurnstileResponse.class)
                    .block();
            return resp != null && resp.success();
        } catch (Exception e) {
            log.error("Error al verificar token de Turnstile: {}", e.getMessage());
            return false;
        }
    }

    record TurnstileRequest(String secret, String response) {}
    record TurnstileResponse(boolean success) {}
}
