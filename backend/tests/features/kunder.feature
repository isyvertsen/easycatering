Feature: Kunder API
  Som en autentisert bruker
  Vil jeg kunne administrere kunder
  Slik at jeg kan holde kundedatabasen oppdatert

  Background:
    Given databasen er seedet med testdata

  Scenario: Hente liste over kunder som autentisert bruker
    Given jeg er logget inn som vanlig bruker
    When jeg sender GET request til "/api/v1/kunder"
    Then responsen skal ha status 200
    And responsen skal være en liste
    And responsen skal inneholde minst 2 elementer

  Scenario: Hente en spesifikk kunde
    Given jeg er logget inn som vanlig bruker
    When jeg sender GET request til "/api/v1/kunder/9001"
    Then responsen skal ha status 200
    And responsen skal inneholde "kundenavn" lik "Test Barnehage"
    And responsen skal inneholde "postnr" lik "3256"

  Scenario: Hente kunde som ikke finnes
    Given jeg er logget inn som vanlig bruker
    When jeg sender GET request til "/api/v1/kunder/99999"
    Then responsen skal ha status 404

  Scenario: Opprette ny kunde
    Given jeg er logget inn som admin
    When jeg sender POST request til "/api/v1/kunder" med body:
      """
      {
        "kundenavn": "Ny Test Kunde",
        "adresse": "Nyveien 10",
        "postnr": "3256",
        "sted": "Larvik",
        "kundeinaktiv": false
      }
      """
    Then responsen skal ha status 200
    And responsen skal inneholde "kundenavn" lik "Ny Test Kunde"

  Scenario: Søke etter kunde
    Given jeg er logget inn som vanlig bruker
    When jeg sender GET request til "/api/v1/kunder?search=Barnehage"
    Then responsen skal ha status 200
    And responsen skal inneholde minst 1 elementer
    And første element skal ha "kundenavn" lik "Test Barnehage"

  Scenario: Uautorisert tilgang til kundeliste
    Given jeg er IKKE logget inn
    When jeg sender GET request til "/api/v1/kunder"
    Then responsen skal ha status 401

  Scenario: Filtrere inaktive kunder
    Given jeg er logget inn som vanlig bruker
    When jeg sender GET request til "/api/v1/kunder?aktiv=true"
    Then responsen skal ha status 200
    And responsen skal inneholde 2 elementer
