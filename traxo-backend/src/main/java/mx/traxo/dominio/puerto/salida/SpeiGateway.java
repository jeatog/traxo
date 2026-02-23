package mx.traxo.dominio.puerto.salida;

import mx.traxo.dominio.modelo.ResultadoRastreo;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface SpeiGateway {
    ResultadoRastreo consultar(
            LocalDate fechaOperacion,
            BigDecimal monto,
            String claveRastreo,
            String emisor,
            String receptor,
            String cuentaBeneficiaria,
            boolean datosCompletos
    );

    List<String> obtenerBancos();
}
