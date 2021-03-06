/* eslint-disable import/first */
import './wp-init';
import { editor, editPost, plugins, data, blocks } from '@frontkom/gutenberg-js';
import registerDrupalStore from './register-drupal-store';
import registerDrupalBlocks from './register-drupal-blocks';
import AdditionalFieldsPluginSidebar from './plugins/additional-fields';

import './sass/index.scss';

(($, Drupal, wp) => {
  Drupal.editors.gutenberg = {
    async attach(element) {
      // Register plugins.
      // plugins.registerPlugin('drupal', {icon: 'forms', render: AdditionalFieldsPluginSidebar});

      // Register store.
      registerDrupalStore(data);

      // Initialize editor.
      await initGutenberg(element);

      // Register blocks.
      // blocks.registerBlockType( storypage.blocks.section.name, storypage.blocks.section.settings );
      // blocks.registerBlockType( storypage.blocks.row.name, storypage.blocks.row.settings );
      await registerDrupalBlocks(blocks, editor);

      // On page load always select sidebar's document tab.
      data.dispatch('core/edit-post').openGeneralSidebar('edit-post/document');

      // Disable tips.
      data.dispatch('core/nux').disableTips();
      
      // Disable inline image block.
      data.dispatch('core/editor').unregisterToken('core/image');

      setTimeout(() => {
        $('.edit-post-header__settings').append($('.gutenberg-header-settings'));
        $('.gutenberg-full-editor').addClass('ready');
        $('#gutenberg-loading').addClass('hide');
      }, 0);

      // Gutenberg is full of buttons which cause the form
      // to submit (no default prevent).
      $(document.forms[0]).on('submit', async e => {
        // Update editor textarea with gutenberg content.
        $(element).val(data.select('core/editor').getEditedPostContent());

        data.dispatch('core/edit-post').openGeneralSidebar('edit-post/document');
        // Clear content "dirty" state.
        data.dispatch('core/editor').savePost();

        // Get the original button clicked.
        let $source = $('[id^="edit-"]:focus');

        // For Firefox...
        if (!$source.length) {
          $source = $(e.originalEvent.explicitOriginalTarget);
        }

        // Only these buttons are allowed to submit.
        if ($source.attr('id') === 'edit-submit' ||
            $source.attr('id') === 'edit-preview' || 
            $source.attr('id') === 'edit-delete') {

          return true;
        }

        // Just stop everything.
        e.preventDefault();
        e.stopPropagation();
        return false;
      });
    },

    // Editor detaching happens when changing editors and
    // when saving the node.
    detach(element, format, trigger) {
      const $textArea = $(element);
      const id = 'editor-' + $textArea.data('drupal-selector');

      // Update fields content with editor content.
      const content = data.select('core/editor').getEditedPostContent();
      $textArea.val(content);

      // Isn't serializing (node save)? Remove the editor.
      if (trigger !== 'serialize') {
        $('#' + id).remove();
      }
    },

    onChange() { // element, callback
    }
  };

  /**
   * Initializes Gutenberg editor.
   * 
   * @param {DOMElement} element Target DOM element, probably a textarea.
   * @returns {Promise}
   */
  function initGutenberg(element) {
    const $textArea = $(element);
    const target = 'editor-' + $textArea.data('drupal-selector');
    const $editor = $('<div id="' + target + '" class="gutenberg__editor"></div>');
    $editor.insertAfter($textArea);
    $textArea.hide();

    wp.node = {
      content: { raw: $(element).val() },
      templates: '',
      // title: { raw: document.title },
      type: 'page',
      // status: 'auto-draft',
      status: 'draft',
      id: 1, // Doesn't really matters because we don't do "AJAX" saves.
    };

    const editorSettings = { 
      alignWide: true,
      availableTemplates: [],
      allowedBlockTypes: true, 
      disableCustomColors: false, 
      disablePostFormats: false,
      mediaLibrary: false,
      titlePlaceholder: Drupal.t('Add title'),
      bodyPlaceholder: Drupal.t('Add text or type / to add content'),
      isRTL: false,
      autosaveInterval: 0,
      canAutosave: false, // to disable Editor Autosave featured (default: true)
      canPublish: false,  // to disable Editor Publish featured (default: true)
      canSave: false,     // to disable Editor Save featured (default: true)    };
    };

    window.customGutenberg = {
      events: {
        'OPEN_GENERAL_SIDEBAR': action => {
          // console.log('OPEN_GENERAL_SIDEBAR', action);
          let tab = action.name.replace(/edit-post\//g, '');
          tab = tab.replace(/drupal\//g, '');

          // Make sure node's "tabs" are in the original placeholder.
          let $tabG = $('.edit-post-sidebar .components-panel .tab');
          $('.gutenberg-sidebar').append($tabG);

          // Should move tab only when sidebar is fully generated.
          setTimeout(() => {
            let $tabD = $('.gutenberg-sidebar .tab.' + tab);
            $('.edit-post-sidebar .components-panel').append($tabD);
          }, 0);

          $(document.body).addClass('gutenberg-sidedar-open');
        },
        'CLOSE_GENERAL_SIDEBAR': () => {
          $(document.body).removeClass('gutenberg-sidedar-open');
          // Move tab before sidebar is "destroyed".
          $('.gutenberg-sidebar').append($('.edit-post-sidebar .components-panel .tab'));
        },
      }
    };

    return new Promise(resolve => {
      // Wait a tick for CKEditor(?) to finish its things.
      setTimeout(() => {
        editPost.initializeEditor( target, 'page', 1, editorSettings, {} );
        resolve();
      }, 0);
    });
  }
})(jQuery, Drupal, wp, drupalSettings, _);
