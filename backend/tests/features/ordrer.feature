Feature: Ordrer API
  Som en autentisert bruker
  Vil jeg kunne administrere ordrer
  Slik at jeg kan håndtere kundebestillinger

  Background:
    Given databasen er seedet med testdata

  Scenario: Hente liste over ordrer
    Given jeg er logget inn som vanlig bruker
    When jeg sender GET request til "/api/v1/ordrer"
    Then responsen skal ha status 200
    And responsen skal være en liste
    And responsen skal inneholde minst 2 elementer

  Scenario: Hente en spesifikk ordre
    Given jeg er logget inn som vanlig bruker
    When jeg sender GET request til "/api/v1/ordrer/9001"
    Then responsen skal ha status 200
    And responsen skal inneholde "kundenavn" lik "Test Barnehage"
    And responsen skal inneholde "ordreid" lik 9001

  Scenario: Hente ordre som ikke finnes
    Given jeg er logget inn som vanlig bruker
    When jeg sender GET request til "/api/v1/ordrer/99999"
    Then responsen skal ha status 404

  Scenario: Uautorisert tilgang til ordreliste
    Given jeg er IKKE logget inn
    When jeg sender GET request til "/api/v1/ordrer"
    Then responsen skal ha status 401

  Scenario: Filtrere ordrer etter kunde
    Given jeg er logget inn som vanlig bruker
    When jeg sender GET request til "/api/v1/ordrer?kundeid=9001"
    Then responsen skal ha status 200
    And responsen skal inneholde minst 1 elementer
