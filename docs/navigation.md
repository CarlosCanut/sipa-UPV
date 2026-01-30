# Navigation

Login redirects each user to their role's home. The sidebar keeps daily work visible. Every protected page/action verifies role; assignment and company edits also verify record ownership. All roles have profile/password settings, pilot evaluation, notifications and sign-out.

| Role         | Pages and transitions                                                                                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coordination | `/simulaciones` → new dialog → `/simulaciones/[id]` → adjust/rerun, compare, export, publish. `/simulaciones/comparar` links back to either result.                                                                             |
| Coordination | `/datos?tab=estudiantes\|tutores\|empresas\|plazas` → `/datos/[type]/[id]` or `/plazas/[id]`; `/datos/importar` → preview → commit → data tab. New student/tutor → `/opciones/usuarios`; new company → `/datos/empresas/nueva`. |
| Coordination | Options → `/opciones/competencias` (catalog/forms) or `/opciones/usuarios` (accounts). `/evaluacion` includes responses, aggregates and export.                                                                                 |
| Student      | `/mi-asignacion` → `/asignaciones/[id]` (contacts); feedback on both views. `/preferencias` → catalog, ranking and competencies; link to profile logistics.                                                                     |
| Company      | `/asignados` → `/asignaciones/[id]` → feedback. `/plazas` → `/plazas/nueva` or `/plazas/[id]` → save/deactivate. Company details in profile.                                                                                    |
| Tutor        | `/mis-estudiantes` → `/asignaciones/[id]` → feedback. Capacity summary → profile availability.                                                                                                                                  |
| Everyone     | `/opciones/perfil` → personal details, role-specific location/capacity and password. `/evaluacion` → own questionnaire. Bell → event destination, marked read. Options → sign out → `/login`.                                   |

```mermaid
flowchart TD
    Login[Login] --> Role{Role}
    Role --> A[Coordination: simulations]
    Role --> S[Student: my assignment]
    Role --> C[Company: assigned students]
    Role --> T[Tutor: my students]
    A --> New[New simulation]
    New --> Result[Results and metrics]
    Result --> Rerun[Adjust and rerun]
    Rerun --> Result
    Result <--> Compare[Compare proposals]
    Result --> Export[CSV exports]
    Result --> Publish[Publish proposal]
    A --> Data[Project data]
    Data --> Edit[Edit actors, companies and offers]
    Data --> Import[CSV preview and import]
    Import --> Data
    A --> Users[Accounts]
    A --> Catalog[Competencies and forms]
    S --> Preferences[Rank offers and assess skills]
    C --> Offers[Create, edit or deactivate offers]
    S --> Detail[Scoped assignment details and contacts]
    C --> Detail
    T --> Detail
    Detail --> Rating[Assignment rating and comment]
    Publish -. Notifications .-> S
    Publish -. Notifications .-> C
    Publish -. Notifications .-> T
    Role --> Shared[Available to every role]
    Shared --> Profile[Profile and password]
    Shared --> Survey[Pilot questionnaire]
    A --> Evaluation[Pilot responses and exports]
    Shared --> Bell[Notifications: open destination]
    Shared --> Logout[Sign out]
    Logout --> Login
```
