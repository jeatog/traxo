package mx.traxo.aplicacion.casos;

import mx.traxo.dominio.modelo.ResultadoRastreo;
import mx.traxo.dominio.puerto.entrada.RastrearSpeiCasoUso;
import mx.traxo.dominio.puerto.salida.SpeiGateway;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
public class RastrearSpei implements RastrearSpeiCasoUso {

    private final SpeiGateway speiGateway;

    public RastrearSpei(SpeiGateway speiGateway) {
        this.speiGateway = speiGateway;
    }

    @Override
    public ResultadoRastreo rastrear(LocalDate fechaOperacion,
                                     BigDecimal monto,
                                     String claveRastreo,
                                     String emisor,
                                     String receptor,
                                     String cuentaBeneficiaria,
                                     boolean datosCompletos) {
        return speiGateway.consultar(fechaOperacion, monto, claveRastreo, emisor, receptor, cuentaBeneficiaria, datosCompletos);
    }
}
