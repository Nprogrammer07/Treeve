namespace Treeve.Application.Comun;

/// <summary>
/// Cifrado en reposo de textos sensibles (ADR-002): el motivo de registro (HU-02) y, con HU-05, el texto de
/// los desahogos. Se implementa en Infrastructure con AES-256-GCM y la llave nunca vive en la base de datos.
/// </summary>
public interface ICifradorDeDatosSensibles
{
    /// <summary>
    /// Cifra <paramref name="textoPlano"/> atado a <paramref name="contexto"/> (p. ej. columna + id del dueño):
    /// el resultado solo se descifra con ese mismo contexto, así que no sirve copiado a otra fila o usuario.
    /// </summary>
    byte[] Cifrar(string textoPlano, string contexto);

    string Descifrar(byte[] datosCifrados, string contexto);
}
