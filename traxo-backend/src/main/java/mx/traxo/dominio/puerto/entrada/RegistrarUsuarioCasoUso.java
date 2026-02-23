package mx.traxo.dominio.puerto.entrada;

import mx.traxo.dominio.modelo.Usuario;

public interface RegistrarUsuarioCasoUso {
    Usuario registrar(String nombre, String email, String contrasena);
}
