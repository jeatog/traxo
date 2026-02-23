package mx.traxo.dominio.puerto.entrada;

import mx.traxo.dominio.modelo.ResultadoRastreo;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface RastrearSpeiCasoUso {

    ResultadoRastreo rastrear(
            LocalDate fechaOperacion,
            BigDecimal monto,
            String claveRastreo,
            String emisor,
            String receptor,
            String cuentaBeneficiaria,
            boolean datosCompletos
    );
}
