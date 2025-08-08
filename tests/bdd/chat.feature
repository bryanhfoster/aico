Feature: Realtime chat presence

  Scenario: User connects and sees presence
    Given a unique GUID
    When the client connects to /ws
    Then the server sends "whoami" with my GUID and a non-empty "onlineGuids"

  Scenario: User sends a message and receives assistant echo
    Given the client is connected
    When the user sends a message "Hello"
    Then the server replies with an "assistant_message" containing "Echo:" or better


