export const ExampleUITD = `UITD "System Title" {
    UI 0 "Menu" actions {
      clicks "Home";
      clicks "Standings";
      clicks "Events";
      clicks "Logout";
    }
    UI 1 "Login" actions {
      clicks "Login";
    }
    UI 2 "Admin Dashboard" actions {
      deletes "user";
    }
    UI 3 "Home" actions {
      clicks "Play";
    }
    UI 4 "Standings" actions {
      selects "Level";
    }
    UI 5 "Events" actions {
      selects "Type";
    }
    FRAGMENT "Reusable Menu" {
      WIDTH 28;
      DRAW { 0, 1, 3, 4, 5 };
      TRANSITION from 0 to 3 if user clicks "Home";
      TRANSITION from 0 to 4 if user clicks "Standings";
      TRANSITION from 0 to 5 if user clicks "Events";
      TRANSITION from 0 to 1 if user clicks "Logout";
    }

    FRAGMENT "Login Flow" {
      DRAW { 1, 2[0] };
      TRANSITION from 1 to 2 if user clicks "Login";
    }

    FRAGMENT "Admin Management" {
      DRAW { 2[0], 4 };
      TRANSITION from 2 to 4 if user deletes "user";
    }

    FRAGMENT "Home Play" {
      DRAW { 3[0], 5 };
      TRANSITION from 3 to 5 if user clicks "Play";
    }

    FRAGMENT "Browsing" {
      DRAW { 4, 5 };
      TRANSITION from 4 to 4 if user selects "Level";
      TRANSITION from 5 to 5 if user selects "Type";
    }
}`;
