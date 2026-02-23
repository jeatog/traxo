package mx.traxo.dominio.modelo;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public record ResultadoRastreo(
        EstadoTransferencia estado,
        LocalDate fechaOperacion,
        LocalTime horaOperacion,
        BigDecimal monto,
        String bancoEmisor,
        String bancoReceptor,
        String descripcion,
        // Campos adicionales solo disponibles con datosCompletos=true. Nunca se persisten.
        String nombreEmisor,
        String nombreReceptor,
        String concepto
) {}
