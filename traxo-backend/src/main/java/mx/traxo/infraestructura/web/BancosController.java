package mx.traxo.infraestructura.web;

import mx.traxo.dominio.puerto.salida.SpeiGateway;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/bancos")
public class BancosController {

    private final SpeiGateway speiGateway;

    public BancosController(SpeiGateway speiGateway) {
        this.speiGateway = speiGateway;
    }

    @GetMapping
    public List<String> listar() {
        return speiGateway.obtenerBancos();
    }
}
