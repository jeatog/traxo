package mx.traxo.infraestructura.web;

import mx.traxo.dominio.puerto.salida.SpeiGateway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/bancos")
public class BancosController {

    private static final Logger log = LoggerFactory.getLogger(BancosController.class);

    private final SpeiGateway speiGateway;

    public BancosController(SpeiGateway speiGateway) {
        this.speiGateway = speiGateway;
    }

    @GetMapping
    public List<String> listar() {
        log.info("Listando bancos disponibles");
        List<String> bancos = speiGateway.obtenerBancos();
        log.info("Bancos obtenidos ->{} bancos", bancos.size());
        return bancos;
    }
}
