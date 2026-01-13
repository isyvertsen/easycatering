Feature: Produkter API
  Som en autentisert bruker
  Vil jeg kunne administrere produkter
  Slik at jeg kan holde produktkatalogen oppdatert

  Background:
    Given databasen er seedet med testdata

  Scenario: Hente liste over produkter
    Given jeg er logget inn som vanlig bruker
    When jeg sender GET request til "/api/v1/produkter"
    Then responsen skal ha status 200
    And responsen skal være en liste
    And responsen skal inneholde minst 3 elementer

  Scenario: Hente et spesifikt produkt
    Given jeg er logget inn som vanlig bruker
    When jeg sender GET request til "/api/v1/produkter/9001"
    Then responsen skal ha status 200
    And responsen skal inneholde "produktnavn" lik "Test Melk 1L"
    And responsen skal inneholde "ean_kode" lik "7038010000001"

  Scenario: Hente produkt som ikke finnes
    Given jeg er logget inn som vanlig bruker
    When jeg sender GET request til "/api/v1/produkter/99999"
    Then responsen skal ha status 404

  Scenario: Søke etter produkt
    Given jeg er logget inn som vanlig bruker
    When jeg sender GET request til "/api/v1/produkter?search=Melk"
    Then responsen skal ha status 200
    And responsen skal inneholde minst 1 elementer
    And første element skal ha "produktnavn" lik "Test Melk 1L"

  Scenario: Filtrere produkter etter kategori
    Given jeg er logget inn som vanlig bruker
    When jeg sender GET request til "/api/v1/produkter?kategori=9001"
    Then responsen skal ha status 200
    And responsen skal inneholde minst 1 elementer

  Scenario: Filtrere produkter med EAN-kode
    Given jeg er logget inn som vanlig bruker
    When jeg sender GET request til "/api/v1/produkter?has_ean=true"
    Then responsen skal ha status 200
    And responsen skal inneholde 2 elementer

  Scenario: Uautorisert tilgang til produktliste
    Given jeg er IKKE logget inn
    When jeg sender GET request til "/api/v1/produkter"
    Then responsen skal ha status 401
