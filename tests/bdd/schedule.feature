Feature: Tripmaster schedule basics

  Scenario: User loads a seeded day and sees routes
    Given seeded schedule data exists for today
    When the user opens the schedule view
    Then at least one route is displayed with assigned or unassigned legs

  Scenario: Assign and unassign a leg
    Given a route and an unassigned leg are visible
    When the user assigns the leg to the route
    Then the leg appears under the route
    When the user unassigns the leg
    Then the leg returns to the holding pen


