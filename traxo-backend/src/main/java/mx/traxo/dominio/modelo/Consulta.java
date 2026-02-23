package mx.traxo.dominio.modelo;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record Consulta(
        UUID id,
        UUID idUsuario,
        Instant fechaConsulta,
        LocalDate fechaOperacion,
        LocalTime horaOperacion,
        BigDecimal monto,
        String bancoEmisor,
        String bancoReceptor,
        EstadoTransferencia estado,
        String alias,
        String concepto
) {}
