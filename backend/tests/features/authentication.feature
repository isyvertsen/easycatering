Feature: User Authentication
  As a user
  I want to authenticate with the system
  So that I can access protected resources

  Scenario: User registers successfully
    Given I have valid registration data
    When I register a new account
    Then I should receive a success response
    And my user account should be created

  Scenario: User logs in with valid credentials
    Given I have a registered account
    When I log in with valid credentials
    Then I should receive access and refresh tokens
    And the tokens should be valid

  Scenario: User logs in with invalid credentials
    Given I have a registered account
    When I log in with invalid credentials
    Then I should receive an authentication error

  Scenario: User refreshes access token
    Given I have a valid refresh token
    When I request a new access token
    Then I should receive new access and refresh tokens

  Scenario: User authenticates with Google OAuth
    Given I have a valid Google ID token
    When I authenticate with Google
    Then I should receive access and refresh tokens
    And my account should be linked to Google