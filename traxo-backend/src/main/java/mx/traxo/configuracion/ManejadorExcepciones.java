package mx.traxo.configuracion;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class ManejadorExcepciones {

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail manejarIllegalArgument(IllegalArgumentException ex) {
        ProblemDetail detalle = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        detalle.setTitle("Solicitud invalida");
        detalle.setDetail(ex.getMessage());
        return detalle;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail manejarValidacion(MethodArgumentNotValidException ex) {
        Map<String, String> errores = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(FieldError::getField, FieldError::getDefaultMessage,
                        (a, b) -> a));
        ProblemDetail detalle = ProblemDetail.forStatus(HttpStatus.UNPROCESSABLE_ENTITY);
        detalle.setTitle("Error de validacion");
        detalle.setProperty("errores", errores);
        return detalle;
    }

    @ExceptionHandler(RuntimeException.class)
    public ProblemDetail manejarRuntime(RuntimeException ex) {
        ProblemDetail detalle = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        detalle.setTitle("Error interno");
        detalle.setDetail(ex.getMessage());
        return detalle;
    }
}
