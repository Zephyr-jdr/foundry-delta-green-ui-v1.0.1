/**
 * Delta Green Player UI
 * Module for Foundry VTT creating a 90s CRT-style user interface
 * @author Zéphyr-JDR
 */

// Module imports
import { UIComponents } from './ui-components.js';
import { RecordsManager } from './records-manager.js';
import { MailSystem } from './mail-system.js';

/**
 * Main module class
 */
export class DeltaGreenUI {
  static ID = 'delta-green-ui-v1.0.1';
  
  /**
   * Module initialization
   */
  static init() {
    console.log('Delta Green UI | Initialization');
    
    // Register settings
    this.registerSettings();
    
    // Add login button
    this.addLoginButton();
    
    // Initialize hooks
    this.initHooks();
  }
  
  /**
   * Register module settings
   */
  static registerSettings() {
    game.settings.register(this.ID, 'uiWidth', {
      name: 'Interface Width',
      hint: 'Width of the CRT interface (% of window)',
      scope: 'client',
      config: true,
      type: Number,
      default: 90,
      range: {
        min: 50,
        max: 100,
        step: 5
      }
    });
    
    game.settings.register(this.ID, 'uiHeight', {
      name: 'Interface Height',
      hint: 'Height of the CRT interface (% of window)',
      scope: 'client',
      config: true,
      type: Number,
      default: 90,
      range: {
        min: 50,
        max: 100,
        step: 5
      }
    });
    
    game.settings.register(this.ID, 'zIndex', {
      name: 'Z-Index',
      hint: 'Z-index of the interface (higher values appear on top)',
      scope: 'client',
      config: true,
      type: Number,
      default: 9,
      range: {
        min: 1,
        max: 10000,
        step: 1
      }
    });
  }
  
  /**
   * Initialize Foundry hooks
   */
  static initHooks() {
    // Ready hook
    Hooks.on('ready', () => {
      this.onReady();
    });
    
    // Chat hook
    Hooks.on('chatMessage', (chatLog, messageText, chatData) => {
      if (this.isInterfaceActive()) {
        MailSystem.handleChatMessage(chatLog, messageText, chatData);
        return false; // Prevents normal message processing
      }
      return true;
    });
    
    // Chat message hook
    Hooks.on('renderChatMessage', (message, html, data) => {
      if (this.isInterfaceActive()) {
        MailSystem.renderChatMessage(message, html, data);
      }
    });
    
    // Actor hooks (records)
    Hooks.on('createActor', (actor, options, userId) => {
      console.log('Delta Green UI | New actor created, checking folder...');
      
      // Refresh immediately
      this.loadLastEntries();
      
      // Then refresh after a short delay to ensure the actor is properly associated with the folder
      setTimeout(() => {
        // Check again if the actor is in the PC Records folder
        const updatedActor = game.actors.get(actor.id);
        if (updatedActor && updatedActor.folder && updatedActor.folder.name === "PC Records") {
          console.log('Delta Green UI | Actor confirmed in PC Records, refreshing latest entries');
          this.loadLastEntries();
          this.forceDisplayLastEntries();
        }
      }, 500);
    });
    
    Hooks.on('updateActor', (actor, changes, options, userId) => {
      console.log('Delta Green UI | Actor updated, checking folder...');
      
      // Refresh immediately
      this.loadLastEntries();
      
      // Then refresh after a short delay to ensure the actor is properly associated with the folder
      setTimeout(() => {
        // Check again if the actor is in the PC Records folder
        const updatedActor = game.actors.get(actor.id);
        if (updatedActor && updatedActor.folder && updatedActor.folder.name === "PC Records") {
          console.log('Delta Green UI | Actor confirmed in PC Records, refreshing latest entries');
          this.loadLastEntries();
          this.forceDisplayLastEntries();
        }
      }, 500);
    });
    
    Hooks.on('deleteActor', (actor, options, userId) => {
      // Since the actor is already deleted, we can't check its folder
      // So we systematically refresh the latest entries
      console.log('Delta Green UI | Actor deleted, refreshing latest entries');
      this.loadLastEntries();
      
      // Force immediate display of entries after a short delay
      setTimeout(() => {
        console.log('Delta Green UI | Forcing display after actor deletion');
        this.loadLastEntries();
        this.forceDisplayLastEntries();
      }, 500);
    });
  }
  
  /**
   * Actions to perform when Foundry is ready
   */
  static onReady() {
    console.log('Delta Green UI | onReady');
    
    try {
      // Load templates
      console.log('Delta Green UI | Loading templates');
      this.loadTemplates().then(() => {
        console.log('Delta Green UI | Templates loaded successfully');
        
        // Initialize components
        console.log('Delta Green UI | Initializing components');
        UIComponents.init();
        RecordsManager.init();
        MailSystem.init();
        
        // Create folder for NPCs if it doesn't exist
        console.log('Delta Green UI | Creating PC Records folder if needed');
        this.createPCRecordsFolder().then(() => {
          console.log('Delta Green UI | PC Records folder check completed');
          
          // Immediate loading of latest entries
          console.log('Delta Green UI | Immediate loading of latest entries from onReady');
          this.loadLastEntries();
          
          // Render and automatically activate the interface for all users
          console.log('Delta Green UI | Rendering interface');
          this.renderInterface().then((success) => {
            if (success) {
              console.log('Delta Green UI | Interface rendered successfully, now activating');
              
              // Use setTimeout to ensure DOM is ready
              setTimeout(() => {
                console.log('Delta Green UI | Delayed activation of interface');
                
                // Check if container exists
                if ($('#dg-crt-container').length > 0) {
                  // Vérifier si l'utilisateur est un MJ
                  if (this.isGameMaster()) {
                    // Ne pas afficher automatiquement l'interface pour le MJ
                    console.log('Delta Green UI | GM detected, not showing interface automatically');
                    $('#dg-crt-container').hide();
                    game.user.setFlag(this.ID, 'interfaceActive', false);
                    $('body').removeClass('dg-crt-active');
                  } else {
                    // Afficher l'interface pour les joueurs normaux
                    console.log('Delta Green UI | Container found, showing it');
                    $('#dg-crt-container').show();
                    game.user.setFlag(this.ID, 'interfaceActive', true);
                    
                    // Add class to body to hide Foundry elements
                    $('body').addClass('dg-crt-active');
                    
                    // Load latest entries after interface rendering
                    console.log('Delta Green UI | Loading latest entries after interface rendering');
                    this.loadLastEntries();
                  }
                } else {
                  console.error('Delta Green UI | Container not found after rendering!');
                  ui.notifications.error("Error activating Delta Green UI interface");
                }
              }, 500);
            } else {
              console.error('Delta Green UI | Interface rendering failed');
            }
          }).catch(error => {
            console.error('Delta Green UI | Error rendering interface:', error);
            ui.notifications.error("Error rendering Delta Green UI interface");
          });
        }).catch(error => {
          console.error('Delta Green UI | Error creating PC Records folder:', error);
        });
      }).catch(error => {
        console.error('Delta Green UI | Error loading templates:', error);
      });
    } catch (error) {
      console.error('Delta Green UI | Error in onReady:', error);
      ui.notifications.error("Error initializing Delta Green UI");
    }
  }
  
  /**
   * Load Handlebars templates
   */
  static async loadTemplates() {
    console.log('Delta Green UI | Loading templates - START');
    
    try {
      const templatePaths = [
        `modules/${this.ID}/templates/records-view.html`,
        `modules/${this.ID}/templates/mail-view.html`,
        `modules/${this.ID}/templates/journal-view.html`, // Ajout du template journal-view.html
        `modules/${this.ID}/templates/scene-view.html` // Ajout du template scene-view.html
      ];
      
      console.log('Delta Green UI | Template paths:', templatePaths);
      
      // Vérifier si les templates existent
      for (const path of templatePaths) {
        console.log(`Delta Green UI | Checking template: ${path}`);
        try {
          const response = await fetch(path);
          if (!response.ok) {
            console.error(`Delta Green UI | Template not found: ${path}`);
          } else {
            console.log(`Delta Green UI | Template found: ${path}`);
          }
        } catch (error) {
          console.error(`Delta Green UI | Error checking template: ${path}`, error);
        }
      }
      
      // Charger les templates
      console.log('Delta Green UI | Loading templates with loadTemplates()');
      const result = await loadTemplates(templatePaths);
      console.log('Delta Green UI | Templates loaded successfully');
      
      return result;
    } catch (error) {
      console.error('Delta Green UI | Error loading templates:', error);
      ui.notifications.error("Error loading Delta Green UI templates");
      return false;
    }
  }
  
  /**
   * Add login button to Foundry interface
   */
  static addLoginButton() {
    console.log('Delta Green UI | Adding login button');
    
    // Use renderSceneControls hook to ensure button is added after UI is ready
    Hooks.on('renderSceneControls', (app, html) => {
      console.log('Delta Green UI | renderSceneControls hook triggered');
      
      // Check if button already exists
      if ($('#dg-login-button').length === 0) {
        console.log('Delta Green UI | Creating login button');
        
        // Create button
        const loginButton = $('<button id="dg-login-button"></button>');
        loginButton.text(game.i18n.localize('DGUI.LogIn'));
        loginButton.click(() => this.openInterface());
        
        // Add button to interface
        $('body').append(loginButton);
        console.log('Delta Green UI | Login button added to body');
      } else {
        console.log('Delta Green UI | Login button already exists');
      }
    });
    
    // Add a backup hook in case renderSceneControls doesn't trigger
    Hooks.on('ready', () => {
      console.log('Delta Green UI | Adding login button via ready hook');
      
      // Wait a moment to ensure UI is fully loaded
      setTimeout(() => {
        if ($('#dg-login-button').length === 0) {
          console.log('Delta Green UI | Creating login button (delayed)');
          
          // Create button
          const loginButton = $('<button id="dg-login-button"></button>');
          loginButton.text(game.i18n.localize('DGUI.LogIn'));
          loginButton.click(() => this.openInterface());
          
          // Add button to interface
          $('body').append(loginButton);
          console.log('Delta Green UI | Login button added to body (delayed)');
        }
      }, 1000);
    });
  }
  
  /**
   * Open interface (only)
   */
  static openInterface() {
    console.log('Delta Green UI | Open Interface');
    
    const container = $('#dg-crt-container');
    
    // If interface doesn't exist yet, create it
    if (container.length === 0) {
      console.log('Delta Green UI | Interface container not found, creating it');
      this.renderInterface().then(() => {
        console.log('Delta Green UI | Interface rendered, now activating it');
        // Once interface is created, activate it
        $('#dg-crt-container').show();
        game.user.setFlag(this.ID, 'interfaceActive', true);
        
        // Add class to body to hide Foundry elements
        $('body').addClass('dg-crt-active');
        
        // Show login animation
        this.showLoginAnimation();
      }).catch(error => {
        console.error('Delta Green UI | Error rendering interface:', error);
        ui.notifications.error("Error rendering Delta Green UI interface");
      });
      return;
    }
    
    // If interface exists but is hidden, show it
    if (!container.is(':visible')) {
      console.log('Delta Green UI | Interface container exists but is hidden, showing it');
      container.show();
      game.user.setFlag(this.ID, 'interfaceActive', true);
      
      // Add class to body to hide Foundry elements
      $('body').addClass('dg-crt-active');
      
      // Show login animation
      this.showLoginAnimation();
      
      // Restart refresh interval
      if (!this.refreshIntervalId) {
        console.log('Delta Green UI | Restarting refresh interval');
        this.refreshIntervalId = setInterval(() => {
          if (this.isInterfaceActive()) {
            this.loadLastEntries();
            // Force immediate display without delay for smooth transition
            this.forceDisplayLastEntries();
          }
        }, 500); // Refresh interval (increased from 100ms to 500ms for better performance)
      }
    } else {
      console.log('Delta Green UI | Interface container is already visible');
    }
  }
  
  /**
   * Show login animation
   */
  static showLoginAnimation() {
    console.log('Delta Green UI | Showing login animation');
    
    // Précharger l'image de fond et l'interface CRT avant de commencer l'animation
    const bgImage = new Image();
    bgImage.src = 'modules/delta-green-ui-v1.0.1/asset/img/BG-sony.png';
    
    // Précharger le logo
    const logoImage = new Image();
    logoImage.src = 'modules/delta-green-ui-v1.0.1/asset/img/DG_logo.png';
    
    // Précharger l'interface CRT avant de commencer l'animation
    this.forceDisplayLastEntries();
    
    // Hide the main interface during animation
    $('#dg-crt-screen').css('opacity', '0');
    
    // Show login animation with completely opaque background
    const $loginAnimation = $('#dg-login-animation');
    $loginAnimation.css({
      'background-color': 'black', // Fond noir complètement opaque
      'z-index': '100', // Au-dessus de tout pendant l'animation
      'opacity': '1' // Complètement opaque
    });
    $loginAnimation.show();
    
    // Variable pour stocker le timeout de sécurité
    let securityTimeout;
    
    // Sécurité principale : forcer la fin de l'animation si elle bug
    securityTimeout = setTimeout(() => {
      console.log('Delta Green UI | Animation security timeout triggered after 7s');
      // Vérifier si l'animation est toujours visible
      if ($loginAnimation.is(':visible')) {
        console.log('Delta Green UI | Animation still visible after 7s, forcing end');
        $loginAnimation.hide();
        $('#dg-crt-screen').css('opacity', '1');
        this.forceDisplayLastEntries();
      }
    }, 7000); // Réduit à 7 secondes pour éviter les attentes trop longues
    
    // Sécurité secondaire : vérifier périodiquement si l'animation est bloquée
    let animationCheckInterval = setInterval(() => {
      // Vérifier si l'animation est terminée normalement
      if (!$loginAnimation.is(':visible')) {
        clearInterval(animationCheckInterval);
        return;
      }
      
      // Vérifier si l'interface CRT est prête
      const isCRTReady = $('#dg-crt-screen').css('opacity') === '1';
      const isLastStepActive = $(`.dg-login-message[data-step="6"]`).hasClass('active');
      
      // Si l'interface est prête et le dernier message est affiché, on peut terminer l'animation
      if (isCRTReady && isLastStepActive) {
        console.log('Delta Green UI | Animation check: CRT ready and last step active, can end animation');
        setTimeout(() => {
          $loginAnimation.hide();
          clearTimeout(securityTimeout);
          clearInterval(animationCheckInterval);
        }, 500);
      }
    }, 1000); // Vérifier toutes les secondes
    
    // Générer une clé d'encryptage aléatoire (optimisé)
    const generateEncryptionKey = (length) => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const charsLength = chars.length;
      let result = "";
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * charsLength));
      }
      return result;
    };
    
    // Clé d'encryptage finale (générée aléatoirement)
    const finalKey = generateEncryptionKey(16);
    
    // Référence à l'élément qui contiendra la clé
    const $encryptionKey = $('#dg-encryption-key');
    
    // Animation steps timing (in ms) - légèrement accéléré
    const steps = [
      { time: 0, keyProgress: 0, message: 1 },
      { time: 700, keyProgress: 3, message: 2 },
      { time: 1300, keyProgress: 6, message: 3 },
      { time: 2000, keyProgress: 9, message: 4 },
      { time: 2700, keyProgress: 12, message: 5 },
      { time: 3400, keyProgress: 14, message: 6 },
      { time: 4000, keyProgress: 15, message: 6 },
      { time: 4500, keyProgress: 16, message: 6 }
    ];
    
    // Fonction pour mettre à jour l'affichage de la clé d'encryptage (optimisé)
    const updateEncryptionKey = (progress) => {
      if (progress >= finalKey.length) {
        $encryptionKey.text(finalKey);
        return;
      }
      
      let keyDisplay = finalKey.substring(0, progress);
      
      // Ajouter les caractères aléatoires pour le reste
      const remainingLength = finalKey.length - progress;
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const charsLength = chars.length;
      
      for (let i = 0; i < remainingLength; i++) {
        keyDisplay += chars.charAt(Math.floor(Math.random() * charsLength));
      }
      
      // Mettre à jour l'affichage
      $encryptionKey.text(keyDisplay);
    };
    
    // Initialiser l'animation de la clé d'encryptage avec requestAnimationFrame pour de meilleures performances
    let keyAnimationRunning = true;
    let lastTimestamp = 0;
    const animateKey = (timestamp) => {
      if (!keyAnimationRunning) return;
      
      // Limiter les mises à jour à environ 10 par seconde (100ms)
      if (timestamp - lastTimestamp > 100) {
        const currentProgress = parseInt($encryptionKey.data('progress') || 0);
        updateEncryptionKey(currentProgress);
        lastTimestamp = timestamp;
      }
      
      requestAnimationFrame(animateKey);
    };
    requestAnimationFrame(animateKey);
    
    // Précharger l'interface CRT
    $('#dg-crt-screen').css('opacity', '0').show();
    
    // Execute each step with Promise pour une meilleure gestion des erreurs
    const executeStep = (step) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          try {
            // Mettre à jour la progression de la clé
            $encryptionKey.data('progress', step.keyProgress);
            
            // Show message if needed
            if (step.message) {
              $(`.dg-login-message[data-step="${step.message}"]`).addClass('active');
            }
            
            resolve();
          } catch (error) {
            console.error('Delta Green UI | Error in animation step:', error);
            resolve(); // Continuer malgré l'erreur
          }
        }, step.time);
      });
    };
    
    // Exécuter les étapes en séquence
    Promise.all(steps.map(executeStep))
      .then(() => {
        // Final step - hide animation and show interface
        setTimeout(() => {
          console.log('Delta Green UI | Animation final step reached, preparing transition');
          
          // Arrêter l'animation de la clé d'encryptage
          keyAnimationRunning = false;
          
          // Afficher la clé finale complète
          $encryptionKey.text(finalKey);
          
          // Rendre l'écran CRT visible mais toujours caché derrière l'animation
          $('#dg-crt-screen').css('opacity', '1');
          
          // Force immediate display of entries pendant que l'animation est encore visible
          this.forceDisplayLastEntries();
          
          // Attendre que tout soit prêt avant de faire la transition
          setTimeout(() => {
            console.log('Delta Green UI | Animation complete, showing interface');
            
            // Masquer l'animation sans fadeOut pour éviter la transparence
            $loginAnimation.hide();
            
            // Annuler le timeout de sécurité car l'animation s'est terminée normalement
            if (securityTimeout) {
              console.log('Delta Green UI | Clearing security timeout as animation completed normally');
              clearTimeout(securityTimeout);
            }
            
            // Arrêter l'intervalle de vérification
            clearInterval(animationCheckInterval);
          }, 300);
        }, 500);
      })
      .catch(error => {
        console.error('Delta Green UI | Error in animation sequence:', error);
        // En cas d'erreur, forcer la fin de l'animation
        $loginAnimation.hide();
        $('#dg-crt-screen').css('opacity', '1');
        clearTimeout(securityTimeout);
        clearInterval(animationCheckInterval);
        keyAnimationRunning = false;
      });
  }
  
  /**
   * Create folder for NPCs
   */
  static async createPCRecordsFolder() {
    // Check if folder already exists
    const folder = game.folders.find(f => f.name === "PC Records" && f.type === "Actor");
    
    // If folder doesn't exist, create it
    if (!folder) {
      await Folder.create({
        name: "PC Records",
        type: "Actor",
        parent: null,
        color: "#33ff33"
      });
      console.log('Delta Green UI | "PC Records" folder created');
    }
  }
  
  /**
   * Toggle interface
   * This method is used only by the LOG OUT button inside the interface
   */
  static toggleInterface() {
    console.log('Delta Green UI | Toggle Interface');
    
    const container = $('#dg-crt-container');
    
    // If interface doesn't exist yet, create it
    if (container.length === 0) {
      this.renderInterface().then(() => {
        // Once interface is created, activate it
        $('#dg-crt-container').show();
        game.user.setFlag(this.ID, 'interfaceActive', true);
      });
      return;
    }
    
    if (container.is(':visible')) {
      // Deactivation
      container.hide();
      
      // Store state
      game.user.setFlag(this.ID, 'interfaceActive', false);
      
      // Remove class from body to show Foundry elements
      $('body').removeClass('dg-crt-active');
      
      // Stop refresh interval to avoid glitches
      if (this.refreshIntervalId) {
        console.log('Delta Green UI | Stopping refresh interval');
        clearInterval(this.refreshIntervalId);
        this.refreshIntervalId = null;
      }
    } else {
      // Activation
      container.show();
      
      // Store state
      game.user.setFlag(this.ID, 'interfaceActive', true);
      
      // Add class to body to hide Foundry elements
      $('body').addClass('dg-crt-active');
      
      // Force immediate display of entries
      this.forceDisplayLastEntries();
      
      // Restart refresh interval
      if (!this.refreshIntervalId) {
        console.log('Delta Green UI | Restarting refresh interval');
        this.refreshIntervalId = setInterval(() => {
          if (this.isInterfaceActive()) {
            this.loadLastEntries();
            // Force immediate display without delay for smooth transition
            this.forceDisplayLastEntries();
          }
        }, 500); // Refresh interval (increased from 100ms to 500ms for better performance)
      }
    }
  }
  
  /**
   * Check if interface is active
   */
  static isInterfaceActive() {
    return game.user.getFlag(this.ID, 'interfaceActive') === true;
  }
  
  /**
   * Check if user is a gamemaster
   */
  static isGameMaster() {
    return game.user.isGM;
  }
  
  /**
   * Render main interface
   */
  static async renderInterface() {
    console.log('Delta Green UI | Rendering interface - START');
    
    try {
      // Get template
      console.log(`Delta Green UI | Loading template from modules/${this.ID}/templates/main-interface.html`);
      const template = await renderTemplate(`modules/${this.ID}/templates/main-interface.html`, {
        userId: game.user.id,
        playerName: game.user.name
      });
      
      console.log('Delta Green UI | Template loaded successfully, length:', template.length);
      
      // Check if container already exists and remove it to avoid duplicates
      if ($('#dg-crt-container').length > 0) {
        console.log('Delta Green UI | Container already exists, removing it');
        $('#dg-crt-container').remove();
      }
      
      // Add to Foundry interface
      console.log('Delta Green UI | Appending template to body');
      $('body').append(template);
      
      // Afficher le bouton LOG OUT uniquement pour les MJ
      if (this.isGameMaster()) {
        $('#dg-logout-button').show();
      } else {
        $('#dg-logout-button').hide();
      }
      
      // Injecter le contenu des templates dans les divs correspondants
      try {
        console.log('Delta Green UI | Injecting templates into divs');
        
        // Récupérer le contenu des templates
        const recordsResponse = await fetch(`modules/${this.ID}/templates/records-view.html`);
        const mailResponse = await fetch(`modules/${this.ID}/templates/mail-view.html`);
        const journalResponse = await fetch(`modules/${this.ID}/templates/journal-view.html`);
        const sceneResponse = await fetch(`modules/${this.ID}/templates/scene-view.html`);
        
        if (recordsResponse.ok) {
          const recordsContent = await recordsResponse.text();
          $('#dg-view-records').html(recordsContent);
          console.log('Delta Green UI | Records template injected');
        }
        
        if (mailResponse.ok) {
          const mailContent = await mailResponse.text();
          $('#dg-view-mail').html(mailContent);
          console.log('Delta Green UI | Mail template injected');
        }
        
        if (journalResponse.ok) {
          const journalContent = await journalResponse.text();
          $('#dg-view-journal').html(journalContent);
          console.log('Delta Green UI | Journal template injected');
        }
        
        if (sceneResponse.ok) {
          const sceneContent = await sceneResponse.text();
          $('#dg-view-scene').html(sceneContent);
          console.log('Delta Green UI | Scene template injected');
        }
      } catch (error) {
        console.error('Delta Green UI | Error injecting templates:', error);
      }
      
      // Verify container was added
      if ($('#dg-crt-container').length === 0) {
        console.error('Delta Green UI | Container not found after append!');
        ui.notifications.error("Error creating Delta Green UI interface");
        return;
      }
      
      console.log('Delta Green UI | Container added successfully');
      
      // Apply settings
      const width = game.settings.get(this.ID, 'uiWidth');
      const height = game.settings.get(this.ID, 'uiHeight');
      const zIndex = game.settings.get(this.ID, 'zIndex');
      
      console.log(`Delta Green UI | Applying settings: width=${width}%, height=${height}%, zIndex=${zIndex}`);
      
      $('#dg-crt-container').css({
        width: `${width}%`,
        height: `${height}%`,
        top: `${(100 - height) / 2}%`,
        left: `${(100 - width) / 2}%`,
        zIndex: zIndex
      });
      
      // Initial hiding
      $('#dg-crt-container').hide();
      console.log('Delta Green UI | Container initially hidden');
      
      // Initialize interface events
      console.log('Delta Green UI | Initializing interface events');
      this.initInterfaceEvents();
      
      // Update agent name in Quick Access
      console.log('Delta Green UI | Updating agent name');
      this.updateAgentName();
      
      // Force display of entries by default
      console.log('Delta Green UI | Forcing display of entries');
      this.forceDisplayLastEntries();
      
      // Load latest entries
      console.log('Delta Green UI | Loading latest entries');
      this.loadLastEntries();
      
      // Load player list
      console.log('Delta Green UI | Loading player list');
      this.loadPlayersList();
      
      // Load scene info
      console.log('Delta Green UI | Loading scene info');
      this.loadSceneInfo();
      
      // Force display after a delay to ensure DOM is ready
      console.log('Delta Green UI | Setting up delayed force display');
      setTimeout(() => {
        console.log('Delta Green UI | Delayed force display triggered');
        this.forceDisplayLastEntries();
      }, 1000);
      
      // Stop old interval if it exists
      if (this.refreshIntervalId) {
        console.log('Delta Green UI | Stopping old refresh interval');
        clearInterval(this.refreshIntervalId);
      }
      
      // Create new refresh interval
      console.log('Delta Green UI | Creating new refresh interval');
      this.refreshIntervalId = setInterval(() => {
        // Check if interface is active before refreshing
        if (this.isInterfaceActive()) {
          console.log('Delta Green UI | Periodic refresh of entries');
          this.loadLastEntries();
          // Force immediate display without delay for smooth transition
          this.forceDisplayLastEntries();
        } else {
          console.log('Delta Green UI | Interface inactive, no refresh');
        }
      }, 500); // Refresh interval (increased from 100ms to 500ms for better performance)
      
      // Restore state - moved to the end to ensure everything is set up
      if (game.user.getFlag(this.ID, 'interfaceActive') === true) {
        console.log('Delta Green UI | Restoring active state');
        // Use setTimeout to ensure everything is ready
        setTimeout(() => {
          console.log('Delta Green UI | Delayed interface activation');
          this.openInterface();
        }, 500);
      }
      
      console.log('Delta Green UI | Rendering interface - END (Success)');
      return true;
    } catch (error) {
      console.error('Delta Green UI | Error rendering interface:', error);
      ui.notifications.error("Error rendering Delta Green UI interface");
      return false;
    }
  }
  
  /**
   * Initialize interface events
   */
  static initInterfaceEvents() {
    console.log('Delta Green UI | Initializing interface events');
    
    // Handle clicks on menu items (event delegation)
    $('#dg-crt-menu').on('click', '.dg-menu-item', function() {
      const view = $(this).data('view');
      console.log('Delta Green UI | Click on menu item:', view);
      
      if (view === 'logout') {
        console.log('Delta Green UI | Logout attempt via delegation');
        // Deactivate interface
        $('#dg-crt-container').hide();
        game.user.setFlag(DeltaGreenUI.ID, 'interfaceActive', false);
        return;
      }
      
      // Gestion spéciale pour settings
      if (view === 'settings') {
        console.log('Delta Green UI | Opening settings');
        // Ouvrir la fenêtre de configuration
        game.settings.sheet.render(true);
        return;
      }
      
      // Gestion spéciale pour scene
      if (view === 'scene') {
        console.log('Delta Green UI | Toggling to active scene');
        // Basculer vers la scène active
        DeltaGreenUI.toggleToActiveScene();
        return;
      }
      
      $('.dg-menu-item').removeClass('active');
      $(this).addClass('active');
      
      $('.dg-view').removeClass('active');
      $(`#dg-view-${view}`).addClass('active');
      
      // If in records view, load records
      if (view === 'records') {
        RecordsManager.loadRecords();
      }
      
      // If in mail view, load messages
      if (view === 'mail') {
        MailSystem.loadMessages();
      }
      
      // If in journal view, load journals
      if (view === 'journal') {
        console.log('Delta Green UI | Loading journals');
        DeltaGreenUI.loadJournals();
      }
    });
    
    // Direct handling of click on LOG OUT button
    $(document).on('click', '#dg-logout-button', function(e) {
      console.log('Delta Green UI | Direct click on LOG OUT button');
      e.preventDefault();
      e.stopPropagation();
      
      // Deactivate interface
      $('#dg-crt-container').hide();
      game.user.setFlag(DeltaGreenUI.ID, 'interfaceActive', false);
      
      // Remove class from body to show Foundry elements
      $('body').removeClass('dg-crt-active');
      
      // Stop refresh interval to avoid glitches
      if (DeltaGreenUI.refreshIntervalId) {
        console.log('Delta Green UI | Stopping refresh interval (via LOG OUT)');
        clearInterval(DeltaGreenUI.refreshIntervalId);
        DeltaGreenUI.refreshIntervalId = null;
      }
    });
    
    // Handle agent sheet view button
    $('#dg-view-agent-sheet').on('click', () => {
      const actor = game.user.character;
      if (actor) {
        actor.sheet.render(true);
      } else {
        ui.notifications.warn(game.i18n.localize('DGUI.NoCharacterAssigned'));
      }
    });
    
    // Player list click handling is now in UIComponents
    
    // Handle records search button
    $('#dg-search-records-btn').on('click', () => {
      $('.dg-menu-item[data-view="records"]').trigger('click');
    });
  }
  
  /**
   * Update agent name in Quick Access
   */
  static updateAgentName() {
    const actor = game.user.character;
    if (actor) {
      $('#dg-current-agent-name').text(actor.name);
    } else {
      $('#dg-current-agent-name').text('NO AGENT ASSIGNED');
    }
  }
  
  // Variable to store refresh interval ID
  static refreshIntervalId = null;
  
  /**
   * Force display of entries in "Last Entries" section
   * This method is used as a fallback if loadLastEntries() fails
   */
  static forceDisplayLastEntries() {
    console.log('Delta Green UI | Forcing display of latest entries');
    
    try {
      // Check if interface is active before continuing
      if (!this.isInterfaceActive()) {
        console.log('Delta Green UI | Interface not active, aborting force display');
        return;
      }
      
      // Find LAST ENTRIES section
      const $section = $('.dg-section').filter(function() {
        return $(this).find('.dg-section-title').text() === 'LAST ENTRIES';
      });
      
      if ($section.length) {
        console.log('Delta Green UI | LAST ENTRIES section found');
        
        // Find or create list
        let $list = $section.find('.dg-results-list');
        if (!$list.length) {
          console.log('Delta Green UI | List not found, creating new list');
          $section.append('<ul class="dg-results-list" id="dg-last-entries-list"></ul>');
          $list = $section.find('.dg-results-list');
        }
        
        // Normal style without debug border
        $list.css({padding: "10px", background: "#111"});
        
        // Check if list is empty
        if ($list.children().length === 0) {
          console.log('Delta Green UI | List empty, calling loadLastEntries()');
          // Instead of adding placeholders, call loadLastEntries()
          this.loadLastEntries();
        } else {
          console.log('Delta Green UI | List already contains entries, preserving');
        }
      } else {
        console.error('Delta Green UI | LAST ENTRIES section not found');
      }
    } catch (error) {
      console.error('Delta Green UI | Error forcing display of latest entries:', error);
    }
  }
  
  
  /**
   * Load player list
   */
  static loadPlayersList() {
    console.log('Delta Green UI | Loading player list');
    const $list = $('#dg-players-list');
    if (!$list.length) {
      console.log('Delta Green UI | Player list not found, calling UIComponents.updatePlayersList()');
      // If list doesn't exist yet, use UIComponents method
      UIComponents.updatePlayersList();
      return;
    }
    
    $list.empty();
    
    // Get active players (except GM)
    const players = game.users.filter(u => u.active && !u.isGM);
    
    if (players.length > 0) {
      players.forEach(player => {
        const characterName = player.character ? player.character.name : 'NO AGENT ASSIGNED';
        $list.append(`
          <li class="dg-result-item" data-user-id="${player.id}">
            ${player.name} - ${characterName}
          </li>
        `);
      });
    } else {
      $list.append('<li class="dg-result-item dg-no-entries">No active players found</li>');
    }
  }
  
  /**
   * Toggle to active scene
   * This method allows players to view the active scene directly
   */
  static toggleToActiveScene() {
    console.log('Delta Green UI | Toggling to active scene');
    
    try {
      // Récupérer la scène active
      const activeScene = game.scenes.active;
      
      if (!activeScene) {
        console.error('Delta Green UI | No active scene found');
        ui.notifications.error("Aucune scène active trouvée");
        return;
      }
      
      // Masquer l'interface Delta Green UI
      $('#dg-crt-container').hide();
      
      // Désactiver la classe qui masque les éléments Foundry
      $('body').removeClass('dg-crt-active');
      
      // Activer la scène
      activeScene.view();
      
      // Transformer le bouton LOGIN en bouton GO BACK
      this.transformLoginToGoBack();
      
    } catch (error) {
      console.error('Delta Green UI | Error toggling to active scene:', error);
      ui.notifications.error("Erreur lors de l'affichage de la scène");
    }
  }
  
  /**
   * Transform login button to go back button
   */
  static transformLoginToGoBack() {
    console.log('Delta Green UI | Transforming login button to go back button');
    
    try {
      // Supprimer l'ancien bouton s'il existe
      $('#dg-login-button').remove();
      
      // Créer le nouveau bouton GO BACK
      const goBackButton = $('<button id="dg-go-back-button">GO BACK</button>');
      goBackButton.css({
        position: 'fixed',
        top: '50px',
        left: '10px',
        zIndex: '100000',
        backgroundColor: 'var(--crt-text)',
        color: 'var(--crt-bg)',
        border: 'none',
        padding: '6px 12px',
        fontFamily: 'PressStart2P, monospace',
        fontSize: '0.8em',
        cursor: 'pointer',
        width: 'auto',
        height: 'auto',
        lineHeight: '1'
      });
      
      // Gestionnaire pour revenir à l'interface
      goBackButton.on('click', function() {
        // Réafficher l'interface Delta Green UI
        $('#dg-crt-container').show();
        
        // Réactiver la classe qui masque les éléments Foundry
        $('body').addClass('dg-crt-active');
        
        // Supprimer le bouton GO BACK
        $(this).remove();
        
        // Restaurer le bouton LOGIN
        DeltaGreenUI.addLoginButton();
      });
      
      // Ajouter le bouton au corps du document
      $('body').append(goBackButton);
    } catch (error) {
      console.error('Delta Green UI | Error transforming login button:', error);
    }
  }
  
  /**
   * Load active scene information
   */
  static loadSceneInfo() {
    console.log('Delta Green UI | Loading scene info');
    
    try {
      // Récupérer la scène active
      const activeScene = game.scenes.active;
      
      if (!activeScene) {
        $('#dg-scene-name').text('No active scene');
        return;
      }
      
      // Mettre à jour le nom de la scène
      $('#dg-scene-name').text(activeScene.name);
      
      // Ajouter un gestionnaire d'événements pour le bouton GO TO SCENE
      $('#dg-go-to-scene').off('click').on('click', () => {
        this.toggleToActiveScene();
      });
      
    } catch (error) {
      console.error('Delta Green UI | Error loading scene info:', error);
      $('#dg-scene-name').text('Error loading scene');
    }
  }
  
  /**
   * Load journals
   */
  static loadJournals() {
    console.log('Delta Green UI | Loading journals');
    
    try {
      // Get journals list element
      const $list = $('#dg-journals-list');
      if (!$list.length) {
        console.error('Delta Green UI | Journals list not found');
        return;
      }
      
      // Clear list
      $list.empty();
      
      // Utiliser la méthode testUserPermission de Foundry VTT pour vérifier les permissions
      // Cette méthode prend en compte toutes les règles de permission de Foundry
      const journals = game.journal.contents.filter(journal => {
        // Vérifier si l'utilisateur peut au moins voir ce journal (permission >= OBSERVER)
        // OBSERVER = 2, mais on accepte aussi LIMITED = 1 et OWNER = 3
        return journal.testUserPermission(game.user, "LIMITED");
      });
      
      console.log('Delta Green UI | Found', journals.length, 'accessible journals');
      
      if (journals.length === 0) {
        $list.append('<li class="dg-result-item dg-no-entries">No journals found</li>');
        return;
      }
      
      // Add journals to list
      journals.forEach(journal => {
        const $item = $(`<li class="dg-result-item" data-journal-id="${journal.id}">${journal.name}</li>`);
        $list.append($item);
        
        // Add click handler
        $item.on('click', function() {
          // Open journal sheet
          journal.sheet.render(true);
        });
      });
    } catch (error) {
      console.error('Delta Green UI | Error loading journals:', error);
      
      // In case of error, display error message
      const $list = $('#dg-journals-list');
      if ($list.length) {
        $list.empty().append('<li class="dg-result-item dg-no-entries">Error loading journals</li>');
      }
    }
  }
  
  // Variable pour suivre si un chargement est en cours
  static isLoadingEntries = false;
  
  // Variable pour stocker le timestamp du dernier chargement réussi
  static lastSuccessfulLoad = 0;
  
  // Nombre d'erreurs consécutives
  static consecutiveErrors = 0;
  
  /**
   * Load latest entries
   */
  static loadLastEntries() {
    // Éviter les appels simultanés qui pourraient causer des freezes
    if (this.isLoadingEntries) {
      console.log('Delta Green UI | Loading already in progress, skipping');
      return;
    }
    
    // Éviter les appels trop fréquents (moins de 300ms entre les appels)
    const now = Date.now();
    if (now - this.lastSuccessfulLoad < 300) {
      console.log('Delta Green UI | Loading too frequent, skipping');
      return;
    }
    
    // Marquer le début du chargement
    this.isLoadingEntries = true;
    
    // Utiliser un timeout pour détecter les opérations trop longues
    const loadTimeout = setTimeout(() => {
      console.warn('Delta Green UI | Loading entries taking too long (>3s), forcing completion');
      this.isLoadingEntries = false;
      this.consecutiveErrors++;
      
      // Si trop d'erreurs consécutives, réduire la fréquence des rafraîchissements
      if (this.consecutiveErrors > 3 && this.refreshIntervalId) {
        console.warn('Delta Green UI | Too many consecutive errors, reducing refresh rate');
        clearInterval(this.refreshIntervalId);
        this.refreshIntervalId = setInterval(() => {
          if (this.isInterfaceActive()) {
            this.loadLastEntries();
          }
        }, 2000); // Augmenter l'intervalle à 2 secondes
      }
    }, 3000);
    
    try {
      // Utiliser une référence DOM directe pour de meilleures performances
      const $list = document.getElementById("dg-last-entries-list") 
        ? $('#dg-last-entries-list') 
        : this._createEntriesList();
      
      // Si la liste n'a pas pu être créée, abandonner
      if (!$list || !$list.length) {
        clearTimeout(loadTimeout);
        this.isLoadingEntries = false;
        return;
      }
      
      // Appliquer le style
      $list.css({padding: "10px", background: "#111"});
      
      // Get PC Records folder - mise en cache pour éviter les recherches répétées
      const folder = this._getPCRecordsFolder();
      
      // Vider la liste de manière optimisée
      $list[0].innerHTML = '';
      
      // Si pas de dossier ou pas d'acteurs, afficher un message
      if (!folder || !this._hasActorsInFolder(folder)) {
        $list.append('<li class="dg-result-item dg-no-entries">No recent entries found</li>');
        this._finishLoading(loadTimeout, true);
        return;
      }
      
      // Récupérer et trier les acteurs
      const recentActors = this._getRecentActors(folder);
      
      // Générer le HTML et l'ajouter à la liste
      const htmlContent = this._generateActorsHTML(recentActors);
      $list.html(htmlContent);
      
      // Ajouter les gestionnaires d'événements
      this._addActorClickHandlers($list);
      
      // Marquer la fin du chargement réussi
      this._finishLoading(loadTimeout, true);
      
    } catch (error) {
      console.error('Delta Green UI | Error loading latest entries:', error);
      
      // En cas d'erreur, afficher un message d'erreur
      const $list = $('#dg-last-entries-list');
      if ($list && $list.length) {
        $list.empty().append('<li class="dg-result-item dg-no-entries">Error loading entries</li>');
      }
      
      // Marquer la fin du chargement avec erreur
      this._finishLoading(loadTimeout, false);
    }
  }
  
  /**
   * Crée la liste des entrées si elle n'existe pas
   * @private
   * @returns {jQuery|null} La liste créée ou null si échec
   */
  static _createEntriesList() {
    try {
      // Rechercher la section LAST ENTRIES
      const $section = $('.dg-section').filter(function() {
        return $(this).find('.dg-section-title').text() === 'LAST ENTRIES';
      });
      
      if ($section.length) {
        $section.append('<ul class="dg-results-list" id="dg-last-entries-list"></ul>');
        return $section.find('.dg-results-list');
      }
      
      return null;
    } catch (error) {
      console.error('Delta Green UI | Error creating entries list:', error);
      return null;
    }
  }
  
  /**
   * Récupère le dossier PC Records
   * @private
   * @returns {Folder|null} Le dossier PC Records ou null s'il n'existe pas
   */
  static _getPCRecordsFolder() {
    return game.folders.find(f => f.name === "PC Records" && f.type === "Actor");
  }
  
  /**
   * Vérifie si le dossier contient des acteurs
   * @private
   * @param {Folder} folder Le dossier à vérifier
   * @returns {boolean} true si le dossier contient des acteurs, false sinon
   */
  static _hasActorsInFolder(folder) {
    return game.actors.filter(a => a.folder?.id === folder.id).length > 0;
  }
  
  /**
   * Récupère les acteurs récents du dossier
   * @private
   * @param {Folder} folder Le dossier contenant les acteurs
   * @returns {Array} Les acteurs récents (max 3)
   */
  static _getRecentActors(folder) {
    // Récupérer tous les acteurs du dossier
    const allActors = game.actors.filter(a => a.folder?.id === folder.id);
    
    // Trier par date de création/modification (du plus récent au plus ancien)
    const sortedActors = [...allActors].sort((a, b) => {
      try {
        // Utiliser l'ID comme source principale de tri (contient souvent un timestamp)
        const aId = a.id || '';
        const bId = b.id || '';
        
        // Extraire les nombres de l'ID pour la comparaison
        const aNum = parseInt(aId.replace(/[^0-9]/g, '') || '0');
        const bNum = parseInt(bId.replace(/[^0-9]/g, '') || '0');
        
        return bNum - aNum; // Ordre décroissant (le plus récent en premier)
      } catch (error) {
        return 0; // En cas d'erreur, ne pas changer l'ordre
      }
    });
    
    // Limiter aux 3 derniers
    return sortedActors.slice(0, Math.min(3, sortedActors.length));
  }
  
  /**
   * Génère le HTML pour les acteurs
   * @private
   * @param {Array} actors Les acteurs à afficher
   * @returns {string} Le HTML généré
   */
  static _generateActorsHTML(actors) {
    let htmlContent = '';
    
    actors.forEach((actor) => {
      try {
        // Récupérer les informations de l'enregistrement en toute sécurité
        let firstName = '';
        let reference = 'UNKNOWN';
        let middleName = '';
        
        try {
          firstName = actor.getFlag(this.ID, 'firstName') || '';
          reference = actor.getFlag(this.ID, 'surname') || 'UNKNOWN';
          middleName = actor.getFlag(this.ID, 'middleName') || '';
        } catch (e) {
          // Ignorer les erreurs et utiliser les valeurs par défaut
        }
        
        // Si les deux sont vides, utiliser le nom de l'acteur
        if (!firstName && reference === 'UNKNOWN') {
          htmlContent += `<li class="dg-result-item" data-actor-id="${actor.id}">${actor.name}</li>`;
        } else {
          htmlContent += `<li class="dg-result-item" data-actor-id="${actor.id}">${reference} - ${firstName} ${middleName}</li>`;
        }
      } catch (error) {
        // En cas d'erreur, ajouter une entrée générique
        htmlContent += `<li class="dg-result-item" data-actor-id="${actor.id}">${actor.name || 'Unknown Record'}</li>`;
      }
    });
    
    return htmlContent;
  }
  
  /**
   * Ajoute les gestionnaires d'événements pour les clics sur les acteurs
   * @private
   * @param {jQuery} $list La liste contenant les acteurs
   */
  static _addActorClickHandlers($list) {
    $list.find('.dg-result-item[data-actor-id]').on('click', function() {
      const actorId = $(this).data('actor-id');
      const actor = game.actors.get(actorId);
      
      if (actor) {
        // Afficher le formulaire d'étude de cas
        RecordsManager.showCaseStudyForm(actor);
      }
    });
  }
  
  /**
   * Termine le chargement et met à jour les variables d'état
   * @private
   * @param {number} loadTimeout L'ID du timeout à annuler
   * @param {boolean} success Indique si le chargement a réussi
   */
  static _finishLoading(loadTimeout, success) {
    clearTimeout(loadTimeout);
    this.isLoadingEntries = false;
    
    if (success) {
      this.lastSuccessfulLoad = Date.now();
      this.consecutiveErrors = 0;
      
      // Si le taux de rafraîchissement a été réduit et que nous avons des succès, le restaurer
      if (this.refreshIntervalId && this.consecutiveErrors === 0) {
        clearInterval(this.refreshIntervalId);
        this.refreshIntervalId = setInterval(() => {
          if (this.isInterfaceActive()) {
            this.loadLastEntries();
          }
        }, 500); // Restaurer l'intervalle normal
      }
    } else {
      this.consecutiveErrors++;
    }
  }
}

// Module initialization
Hooks.once('init', () => {
  DeltaGreenUI.init();
});

// No need for separate '
