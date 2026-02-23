package mx.traxo.dominio.puerto.entrada;

import mx.traxo.dominio.modelo.Usuario;

import java.util.UUID;

public interface ActualizarPerfilCasoUso {
    Usuario obtenerPerfil(UUID idUsuario);
    Usuario actualizarNombre(UUID idUsuario, String nombre);
    void cambiarContrasena(UUID idUsuario, String contrasenaActual, String contrasenaNueva);
    void eliminarCuenta(UUID idUsuario);
}
