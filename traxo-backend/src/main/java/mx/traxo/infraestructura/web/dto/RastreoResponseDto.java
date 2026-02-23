package mx.traxo.infraestructura.web.dto;

import mx.traxo.dominio.modelo.EstadoTransferencia;
import mx.traxo.dominio.modelo.ResultadoRastreo;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public record RastreoResponseDto(
        EstadoTransferencia estado,
        LocalDate fechaOperacion,
        LocalTime horaOperacion,
        BigDecimal monto,
        String bancoEmisor,
        String bancoReceptor,
        String descripcion,
        // Presentes solo cuando el cliente pidió datosCompletos=true. No se persisten.
        String nombreEmisor,
        String nombreReceptor,
        String concepto
) {
    public static RastreoResponseDto desde(ResultadoRastreo resultado) {
        return new RastreoResponseDto(
                resultado.estado(),
                resultado.fechaOperacion(),
                resultado.horaOperacion(),
                resultado.monto(),
                resultado.bancoEmisor(),
                resultado.bancoReceptor(),
                resultado.descripcion(),
                resultado.nombreEmisor(),
                resultado.nombreReceptor(),
                resultado.concepto()
        );
    }
}
