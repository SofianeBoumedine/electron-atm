// Run this function after the page has loaded
// 

$(function () {
  const electron = nodeRequire('electron')
  const ipc = electron.ipcRenderer
  const BrowserWindow = electron.remote.BrowserWindow
  const settings = nodeRequire('electron-settings');
  const mousetrap = nodeRequire('mousetrap');
  const path = nodeRequire('path')

  /**
   * Navigation
   * 
   */
  var nav_buttons = [
    '#atm-button-menu', 
    '#states-button-menu', 
    '#fits-button-menu', 
    '#cards-button-menu'];

  // elements is a dictionary of elements to be shown by clicking on each nav button. The other elements are to be hidden
  var elements = {
    '#atm-button-menu': ['#atm-page', '#atm-buffers', '#atm-bottom-navbar'],
    '#states-button-menu': ['#states-page', '#search-state-form'],
    '#fits-button-menu': ['#fits-page'],
    '#cards-button-menu': ['#cards-page', '#cards-page-form'],
  };

  nav_buttons.forEach((button) => {
    $(button).on('click', _ => {
      for (var element in elements){
        if (elements.hasOwnProperty(element)){
          if(button === element){
            elements[element].forEach((e) => {
              $(e).show();
            });
          } else {
            elements[element].forEach((e) => {
              $(e).hide();
            });
          }
        }
      }
    })
  });

  /**
   *  ATM
   */
  
  $('#atm-status-button').on('click', _ => {
    /*
    settings.set('host', {
      'ip': $('#host').val(), 
      'port': $('#port').val()});

    ipc.send('connect-button-pressed', $('#host').val(), $('#port').val());
    */
    ipc.send('connect-button-pressed');
  });

  $('#card-inserted').on('click', _ => {

    var card = cards.get($("#atm-page-cards-list option:selected").text());
    var track2 = cards.getTrack2(card);

    if(card)
      ipc.send('ui-read-card', card.number, track2);
  });

  // Preventing page from refreshing when submit buttons pressed
  $("#connection-data-form").submit(function(e) {
    e.preventDefault();
  });

  $("#card-read-form").submit(function(e) {
    e.preventDefault();
  });

  // Updating screen image
  var screen_rows = ['at','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'];  
  ipc.on('ui-change-screen-image', (event, image) => {
    if(image){
      var screen = atm.display.getScreen();

      // Clear text
      if(screen && screen.clear_screen){
        screen_rows.forEach( (element) => {
          $( '#' + element + '-screen-row').html('');
        });
      }

      // Replacing on screen text
      var screen_text = atm.display.getHTML();
      if(screen_text){
        screen_rows.forEach( (element) => {
          $( '#' + element + '-screen-row').html(screen_text[element]);
        });
      }

      // Changing image
      $("#screen").attr("src", "/home/tim/share/screens/" + image);
    }
  })

  setInterval(function() {
    // Replacing on screen text
    var screen_text = atm.display.getHTML();
    if(screen_text){
      screen_rows.forEach( (element) => {
        $( '#' + element + '-screen-row').html(screen_text[element]);
      });
    }
  }, 200);

  // FDKs shortcuts
  var FDKs = ['a', 'b', 'c', 'd', 'f', 'g', 'h', 'i'];
  FDKs.forEach( (element) => {
    mousetrap.bind(element, function() { 
      ipc.send('fdk-pressed', element.toUpperCase());
    });
  });

  // FDKs mouse click bindings
  FDKs = ['#FDK-A', '#FDK-B', '#FDK-C', '#FDK-D', '#FDK-F', '#FDK-G', '#FDK-H', '#FDK-I'];
  FDKs.forEach( (element) => {
    $(element).on('click', _ => {
      ipc.send('fdk-pressed', $(element).text());
    });
  });

  // Pinpad buttons keyboard shortcuts
  var pinpadButtons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'esc', 'enter', 'backspace'];
  pinpadButtons.forEach( (element) => {
    mousetrap.bind(element, function() { 
      ipc.send('pinpad-button-pressed', element);
    });
  });

  // cursor keys
  var cursorButtons = ['left', 'right', 'up', 'down'];
  cursorButtons.forEach( (element) => {
    mousetrap.bind(element, function() { 
      var move_x = 0;
      var move_y = 0;

      switch(element){
        case 'left':
          move_x = -700;
          break;
        case 'right':
          move_x = 700;
          break;
        case 'up':
          move_y = -700;
          break;
        case 'down':
          move_y = 700;
          break;
      }


      var current_position = graph.getViewPosition();
      graph.moveTo({
        position: {
          'x': current_position.x + move_x,
          'y': current_position.y + move_y,
        },
        animation: {
          duration: 500,
          easingFunction: 'easeOutQuad'
        }
      });
    });
  });

  // Activating/deactivating FDK buttons
  var activeFDKs = [];
  setInterval(function() {
    if(atm.activeFDKs != activeFDKs){
      activeFDKs = atm.activeFDKs;
      
      FDKs.forEach( (element) => {
        $(element).prop('disabled', true);
      });

      activeFDKs.forEach( (button) => {
        if(button)
          $('#FDK-' + button).prop('disabled', false);
      })
    }
  }, 200);

  // Current state update
  var current_state = '';
  setInterval(function() {
    if(atm.current_state.number != current_state){
      current_state = atm.current_state.number;
      if(atm.current_state.number){
        $("#current-state").val(atm.current_state.number.toString() + ' ' + atm.current_state.type);
        ipc.send('ui-update-state', atm.current_state);
      }
    }
  }, 200);

  // Current screen update
  var current_screen = '';
  setInterval(function() {
    if(atm.display.getScreenNumber() != current_screen){
      current_screen = atm.display.getScreenNumber();
      if(current_screen)
        $("#current-screen").val(current_screen);
    }
  }, 200);

  // PIN buffer update
  var PIN_buffer = '';
  setInterval(function() {
    if(atm.PIN_buffer != PIN_buffer){
      PIN_buffer = atm.PIN_buffer;
      $("#pin-buffer").val(PIN_buffer);
    }
  }, 200);

  // Buffer B update
  var buffer_B = '';
  setInterval(function() {
    if(atm.buffer_B != buffer_B){
      buffer_B = atm.buffer_B;
      $("#buffer-b").val(buffer_B);
    }
  }, 200);

  // Buffer C update
  var buffer_C = '';
  setInterval(function() {
    if(atm.buffer_C != buffer_C){
      buffer_C = atm.buffer_C;
      $("#buffer-c").val(buffer_C);
    }
  }, 200);

  // Opcode buffer update
  var opcode_buffer = '';
  setInterval(function() {
    if(atm.opcode.getBuffer() != opcode_buffer){
      opcode_buffer = atm.opcode.getBuffer();
      $("#opcode-buffer").val(opcode_buffer.split(' ').join('_'));
    }
  }, 200);

  // Amount buffer update
  var amount_buffer = '';
  setInterval(function() {
    if(atm.amount_buffer != amount_buffer){
      amount_buffer = atm.amount_buffer;
      $("#amount-buffer").val(amount_buffer);
    }
  }, 200);

  // Terminal key update
  var pin_key = '';
  setInterval(function() {
    if(crypto.getTerminalKey()[0] != pin_key){
      // TODO: move to another service
      pin_key = cards.decorateCardNumber(crypto.getTerminalKey()[0]);
      $("#comms-key").val(pin_key);
      $("#comms-key-cv").val(crypto.getTerminalKey()[1]);
    }
  }, 500);

  // Master key update
  var master_key = '';
  setInterval(function() {
    if(crypto.getMasterKey()[0] != master_key){
      // TODO: move to another service
      master_key = cards.decorateCardNumber(crypto.getMasterKey()[0]);
      $("#master-key").val(master_key);
      $("#master-key-cv").val(crypto.getMasterKey()[1]);
    }
  }, 500);

  // Status button update
  var status = '';
  
  setInterval(function() {
    function clearButtonClasses(){
      $('#atm-status-button').removeClass('btn-success');
      $('#atm-status-button').removeClass('btn-warning');
      $('#atm-status-button').removeClass('btn-danger');
    };

    function clearIconClasses(){
      $('#atm-status-icon').removeClass('glyphicon-link');
      $('#atm-status-icon').removeClass('glyphicon-wrench');
      $('#atm-status-icon').removeClass('glyphicon-remove-circle');
    };

    if(atm.status != status){
      status = atm.status;

      $('#atm-status-button').attr('title', 'ATM is ' + atm.status);
      switch(status){
        case 'Offline':
          clearButtonClasses();
          clearIconClasses();
          $('#atm-status-icon').addClass('glyphicon-remove-circle');
          $('#atm-status-button').addClass('btn-danger')
          break;

        case 'Connected':
          clearButtonClasses();
          clearIconClasses();
          $('#atm-status-icon').addClass('glyphicon-link');
          break;

        case 'In-Service':
          clearButtonClasses();
          clearIconClasses();
          $('#atm-status-button').addClass('btn-success')
          $('#atm-status-icon').addClass('glyphicon-link');
          break;

        case 'Out-Of-Service':
          clearButtonClasses();        
          clearIconClasses();
          $('#atm-status-button').addClass('btn-warning')
          $('#atm-status-icon').addClass('glyphicon-wrench');
          break;
      }      
    }
  }, 300);
})