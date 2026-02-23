package mx.traxo.infraestructura.web.dto;

import mx.traxo.dominio.modelo.Consulta;
import mx.traxo.dominio.modelo.EstadoTransferencia;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record ConsultaResponseDto(
        UUID id,
        Instant fechaConsulta,
        LocalDate fechaOperacion,
        LocalTime horaOperacion,
        BigDecimal monto,
        String bancoEmisor,
        String bancoReceptor,
        EstadoTransferencia estado,
        String alias,
        String concepto
) {
    public static ConsultaResponseDto desde(Consulta consulta) {
        return new ConsultaResponseDto(
                consulta.id(),
                consulta.fechaConsulta(),
                consulta.fechaOperacion(),
                consulta.horaOperacion(),
                consulta.monto(),
                consulta.bancoEmisor(),
                consulta.bancoReceptor(),
                consulta.estado(),
                consulta.alias(),
                consulta.concepto()
        );
    }
}
