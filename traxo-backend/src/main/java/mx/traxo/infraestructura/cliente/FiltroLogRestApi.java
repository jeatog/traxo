package mx.traxo.infraestructura.cliente;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import reactor.core.publisher.Mono;

public class FiltroLogRestApi implements ExchangeFilterFunction {

    private static final Logger log = LoggerFactory.getLogger(FiltroLogRestApi.class);

    @Override
    public Mono<ClientResponse> filter(ClientRequest peticion, ExchangeFunction siguiente) {
        registrarPeticion(peticion);
        return siguiente.exchange(peticion)
                .flatMap(respuesta -> respuesta.bodyToMono(String.class)
                        .defaultIfEmpty("")
                        .map(body -> {
                            registrarRespuesta(respuesta, body);
                            return respuesta.mutate().body(body).build();
                        }))
                .doOnError(this::registrarError);
    }

    private void registrarPeticion(ClientRequest peticion) {
        log.info("== PETICION MICROS BEGIN ===============================================");
        log.info("URI     : {}", peticion.url());
        log.info("Metodo  : {}", peticion.method());
        log.info("Headers : {}", peticion.headers());
        peticion.attribute("logBody").ifPresent(body -> log.info("Body    : {}", body));
        log.info("== PETICION MICROS END =================================================");
    }

    private void registrarRespuesta(ClientResponse respuesta, String body) {
        log.info("== RESPUESTA MICROS BEGIN ==============================================");
        log.info("Status  : {}", respuesta.statusCode());
        log.info("Headers : {}", respuesta.headers().asHttpHeaders());
        if (body != null && !body.isBlank()) {
            log.info("Body    : {}", body);
        }
        log.info("== RESPUESTA MICROS END ================================================");
    }

    private void registrarError(Throwable error) {
        log.error("== ERROR MICROS ========================================================");
        log.error("Error   : {}", error.getMessage());
        log.error("== FIN ERROR MICROS ====================================================");
    }
}
