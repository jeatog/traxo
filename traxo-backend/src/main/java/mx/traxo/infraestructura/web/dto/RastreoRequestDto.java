package mx.traxo.infraestructura.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RastreoRequestDto(
        @NotNull LocalDate fechaOperacion,
        @NotNull @DecimalMin("0.01") BigDecimal monto,
        @NotBlank String claveRastreo,
        @NotBlank String emisor,
        @NotBlank String receptor,
        @NotBlank String cuentaBeneficiaria,
        boolean datosCompletos
) {}
