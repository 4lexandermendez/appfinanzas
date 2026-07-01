# Planificación: App de Finanzas Personales
> Basada en la Plantilla de Presupuesto Anual (Excel actual)

---

## 1. ¿Qué tiene el Excel actualmente?

### Estructura general
La plantilla tiene **13 hojas**: una por cada mes (Ene–Dic) y una hoja de **Resumen del Año**.

---

### Hoja: Resumen del Año
Consolida los totales de todo el año agrupados por categoría:

| Categoría | Estimado | Real |
|---|---|---|
| Ingresos | ✓ | ✓ |
| Ahorros | ✓ | ✓ |
| Gastos fijos | ✓ | ✓ |
| Gastos variables | ✓ | ✓ |
| Deudas | ✓ | ✓ |

Además muestra los totales mensuales desglosados por sección (Ingresos por mes, Gastos Fijos por mes, Gastos Variables por mes, Ahorros por mes, Deudas por mes).

---

### Hoja mensual (Ene, Feb, Mar... Dic)
Cada mes tiene las siguientes secciones:

#### Mini resumen lateral
- Ingresos (presupuestado vs real)
- Ahorros
- Gastos fijos
- Gastos variables
- Deudas
- **"Sin usar"** — lo que sobró o faltó al final del mes

---

#### Sección: DINERO QUE ENTRA

**Ingresos**
- Nombre del ingreso (ej. Quincena 1, Quincena 2, Incapacidad, Salario)
- Estimado
- Real
- Diferencia (calculada)
- Total

**Ahorros**
- Nombre del ahorro
- Estimado
- Real
- Diferencia

---

#### Sección: DINERO QUE USAS

**Gastos Fijos**
Lista administrable completamente. Todos los ítems se pueden agregar, deshabilitar o eliminar sin excepción. No hay distinción de categorías entre "siempre fijos" y "suscripciones", todos se gestionan igual.

Ejemplos encontrados en el Excel:
- Recibo Luz, Recibo Agua, Recibo Internet
- Netflix, Spotify, Apple Music, HBO Max, YouTube Premium
- Internet Celular, Plan Claro
- Corte de cabello, GYM, Dentista
- Agua Oficina, PedidosYa, Seguro tarjeta

Columnas: Gasto | Estimado | Real | Diferencia

> El autocompletado al escribir un gasto fijo nuevo aprende del historial propio del usuario. Si ya escribió "Netflix" antes, al escribir "Net..." lo sugiere automáticamente.

**Gastos Variables**
Dos ítems fijos siempre presentes por defecto: **Transporte** y **Comida**. El resto se escribe manualmente con autocompletado del historial propio.

Ejemplos adicionales del Excel:
- Consulta médica, Farmacia, Regalos
- Gasolina, Salidas / entretenimiento
- Compras en línea (Temu, etc.), Universidad

Columnas: Gasto | Estimado | Real | Diferencia

> La columna **Real** de Transporte y Comida se llena automáticamente desde el Tracker Diario (ver más abajo). No se escribe manual.

**Deudas**
- Nombre de la deuda
- Estimado
- Real
- Actual (saldo pendiente)

---

#### Sección: Tracker de Gastos Diarios

Tabla por semanas del mes. Columnas: Lunes | Martes | Miércoles | Jueves | Viernes | Sábado | Total Semana.

**Botones rápidos por concepto (configurables desde Ajustes):**
En lugar de escribir el monto a mano, cada concepto tiene botones de montos frecuentes, igual que los cajeros automáticos.

Ejemplo de configuración actual:
- Pasaje: botones de $0.30 / $0.32 / $0.50 + campo libre
- Desayuno: botones de $1.00 / $1.50 + campo libre
- Almuerzo: botones de $2.50 / $3.00 + campo libre

Los montos de los botones se configuran desde Ajustes y se pueden cambiar en cualquier momento.

**Flujo de datos del Tracker hacia Gastos Variables:**

```
Registro diario (cada día)
        ↓
Resumen semanal (suma automática de la semana)
        ↓
Resumen quincenal (suma de semanas de la quincena)
        ↓
Total mensual real → se refleja automáticamente en
la columna Real de Transporte y Comida en Gastos Variables
```

El usuario solo registra día a día. Todo lo demás se calcula solo.

---

#### Sección: Gastos detallados quincenales

Resume el gasto real de Transporte y Comida por quincena. Se llena automáticamente desde el Tracker Diario, no se escribe manual.

| | Quincena 1 | Real | Ahorrado | Quincena 2 | Real | Ahorrado | TOTAL |
|---|---|---|---|---|---|---|---|
| Transporte | (calculado) | (auto) | (auto) | (calculado) | (auto) | (auto) | (auto) |
| Comida | (calculado) | (auto) | (auto) | (calculado) | (auto) | (auto) | (auto) |

---

#### Sección: Presupuesto estimado automático (Transporte y Comida)

La app calcula sola el estimado de cada quincena basándose en el calendario real del mes y la configuración del usuario.

**Lógica de días laborales:**

| Tipo de día | Conceptos que aplican |
|---|---|
| Lunes a Viernes | Pasaje ida + Desayuno + Almuerzo + Pasaje regreso |
| Sábado que toca ir | Pasaje ida + Desayuno + Pasaje regreso (sin almuerzo, se sale a las 12) |
| Sábado que no toca | No aplica nada |
| Día marcado como libre | No aplica nada (se excluye del estimado) |

**Patrón de sábados:**
- Alternos: un sábado sí, uno no
- El patrón se define desde una fecha de inicio (ej. "el sábado 4 de julio de 2026 no vengo")
- La app calcula automáticamente todos los sábados siguientes del año hasta que el usuario cambie la configuración

**Cambios de monto en Ajustes:**
Si el usuario cambia el monto de un concepto (ej. el pasaje sube de $0.32 a $0.50), el nuevo monto solo afecta los días que faltan del mes actual en adelante. Los días ya pasados conservan el monto con el que fueron registrados. Solo impacta el estimado, nunca el real ya registrado.

**Días especiales entre semana:**
El usuario puede marcar días individuales como "no voy" (vacación, asueto, descanso). Esos días se excluyen automáticamente del cálculo del estimado. Se marcan manualmente desde el calendario de la app.

---

#### Sección: TRACKER DE GASTOS (Transacciones)
Lista de cada transacción individual del mes:

| Categoría | Cantidad | Fecha | Notas |

Ejemplos reales del Excel:
- Consulta médica — $30 — cirugía
- Regalo Katy — $64 — regalo
- Salida con Ale — $31.40 — cine y cena
- Gasolina Rhene — $20.19
- Farmacia Bry — $36.21 — cirugía

---

#### Sección: Notas del mes
Campo libre para anotar observaciones (ej. "cirugía pendiente $1,657", "debo gasolina para TJT").

---

#### Resumen del mes
| Categoría | Presupuesto | Real |
|---|---|---|
| Ingresos | | |
| Ahorros | | |
| Gastos fijos | | |
| Gastos variables | | |
| Deudas | | |

---

## 2. Limitaciones del Excel actual

- No es cómodo en móvil — registrar un gasto desde el iPhone en Excel es lento.
- No tiene alertas — no avisa si te estás pasando del presupuesto.
- No tiene tarjetas de crédito integradas — las deudas siempre aparecen en $0.
- No tiene fechas de corte ni fechas de pago de tarjetas.
- Los gastos recurrentes se escriben cada mes manualmente.
- No tiene gráficas ni visualizaciones.
- El tracker diario es difícil de llenar en Excel.
- No hay historial comparativo fácil entre meses.
- El estimado de transporte y comida se calcula manualmente contando días del calendario.

---

## 3. Mejoras propuestas para la App

### Módulo: Registro rápido de gastos (pantalla principal en móvil)
Lo más importante. Desde el iPhone, al abrir la app:
- Cuánto llevas gastado hoy
- Botón grande para registrar un gasto: categoría + monto + nota (3 campos, rápido)
- Botones rápidos configurables por concepto (como cajero automático)
- Autocompletado de categorías desde el historial propio

### Módulo: Gastos fijos administrables
- Lista única donde todos los ítems se pueden agregar, deshabilitar o eliminar
- Sin distinción rígida entre "siempre fijos" y "suscripciones"
- Al deshabilitar un ítem no aparece en el mes pero queda guardado para reactivarlo

### Módulo: Estimado automático de Transporte y Comida
- Calcula solo el presupuesto estimado según el calendario real del mes
- Respeta el patrón de sábados alternos configurado por el usuario
- Excluye días marcados manualmente como libres (vacación, asueto, descanso)
- Si cambia un monto en Ajustes, solo afecta los días que faltan, nunca los ya pasados

### Módulo: Tarjetas de crédito
Por cada tarjeta:
- Nombre, límite de crédito, fecha de corte, fecha límite de pago
- Saldo actual del ciclo y lista de compras cargadas
- Aviso de días restantes para el corte
- Aviso de días restantes para pagar
- Diferencia entre pago mínimo y pago total para no generar intereses

### Módulo: Alertas inteligentes
- ⚠️ Amarillo: gastaste más del 80% del presupuesto en una categoría
- 🔴 Rojo: superaste el presupuesto en una categoría
- 💳 Aviso: tu tarjeta corta en X días, llevás $X cargado
- 📅 Aviso: tenés que pagar tu tarjeta en X días, debés $X
- 📊 General: "Este mes llevás gastado $X de $Y. Te quedan Z días y $W disponibles"
- 🚫 Límite: "Estás al límite en Gastos Variables, reducí o ajustá tu presupuesto"

### Módulo: Dashboard visual
- Gráfica de dona: distribución del gasto por categoría del mes
- Barras: estimado vs real por categoría
- Línea: ingresos vs gastos por mes durante el año
- Indicador de ahorro: cuánto ahorraste vs cuánto planificaste

### Módulo: Resumen anual mejorado
- Vista de los 12 meses en una sola pantalla
- Mes con más gasto, mes con más ahorro
- Tendencias: ¿en qué categoría siempre te excedés?
- Total ahorrado real en el año

### Módulo: Metas de ahorro
- Metas con nombre, monto objetivo y progreso visual
- Ej: "Fondo de emergencia — meta $500 — ahorrado $120"

---

## 4. Stack tecnológico definido

| Parte | Tecnología |
|---|---|
| Frontend | React (Vite) + Tailwind CSS |
| Backend | Node.js + Express |
| Base de datos | MySQL |
| ORM | Prisma |
| Autenticación | JWT (JSON Web Tokens) |
| Deploy frontend | Vercel (gratis) |
| Deploy backend | Railway o Render (gratis) |

---

## 5. Modelo de base de datos (borrador)

### Tablas principales

**usuarios**
- id, nombre, email, password_hash, creado_en

**presupuesto_mensual**
- id, usuario_id, año, mes, notas

**gastos_fijos_config** *(lista administrable, se define una vez y se reutiliza)*
- id, usuario_id, nombre, monto_estimado, activo (true/false)

**ingresos**
- id, presupuesto_id, nombre, monto_estimado, monto_real, fecha

**categorias_variables**
- id, usuario_id, nombre, es_default (true para Transporte y Comida)

**transacciones** *(cada gasto registrado)*
- id, presupuesto_id, categoria_id, monto, fecha, notas, fuente (efectivo / tarjeta_id)

**tracker_diario** *(registro día a día de transporte y comida)*
- id, presupuesto_id, fecha, concepto (pasaje_ida / desayuno / almuerzo / pasaje_regreso), monto

**ahorros**
- id, presupuesto_id, nombre, monto_estimado, monto_real

**metas_ahorro**
- id, usuario_id, nombre, monto_objetivo, monto_actual, fecha_limite

**tarjetas_credito**
- id, usuario_id, nombre, limite, dia_corte, dia_pago, saldo_actual

**movimientos_tarjeta**
- id, tarjeta_id, monto, fecha, descripcion, transaccion_id (nullable)

**ajustes_tracker** *(configuración del estimado automático)*
- id, usuario_id
- monto_pasaje_ida, monto_desayuno, monto_almuerzo, monto_pasaje_regreso
- monto_pasaje_sabado_ida, monto_desayuno_sabado, monto_pasaje_sabado_regreso
- patron_sabado_inicio (fecha desde donde empieza el patrón alterno)
- patron_sabado_primer_dia_va (true/false — si el primer sábado del patrón es "sí voy")

**dias_libres** *(días marcados manualmente como no laborales)*
- id, usuario_id, fecha, motivo (vacación / asueto / descanso / otro)

**botones_rapidos_config** *(montos de botones rápidos por concepto)*
- id, usuario_id, concepto, monto_1, monto_2, monto_3

**alertas_config**
- id, usuario_id, tipo, porcentaje_alerta (ej. 80), activo

---

## 6. Orden de desarrollo sugerido

1. **Modelo de base de datos** — definir y afinar todas las tablas con Prisma
2. **Backend base** — Node + Express + Prisma conectado a MySQL
3. **Autenticación** — registro, login, JWT
4. **API de transacciones** — registrar, listar, editar gastos
5. **API del tracker diario** — con lógica del estimado automático por calendario
6. **Frontend base** — React + Vite + Tailwind, estructura de pantallas
7. **Pantalla de registro rápido con botones** — prioritaria para uso diario en móvil
8. **Dashboard del mes** — resumen visual con gráficas
9. **Módulo de gastos fijos administrables**
10. **Módulo de tarjetas de crédito**
11. **Alertas**
12. **Resumen anual**
13. **Metas de ahorro**
14. **Ajustes** — patrón de sábados, botones rápidos, montos del tracker

---

*Documento de planificación. Se actualiza conforme se afinan los detalles antes de iniciar desarrollo.*
