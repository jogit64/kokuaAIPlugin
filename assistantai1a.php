<?php

/**
 * Plugin Name: Assistant-ai-1a
 * Description: Un widget personnalisé pour intégrer mon application Flask.
 * Version: 1.0 - IA base 050424
 * Author: johannr.fr
 */

// Classe qui définit le widget personnalisé.
class Assistant1a_Widget extends WP_Widget
{
    // Constructeur : initialise le widget
    public function __construct()
    {
        parent::__construct(
            'assistant1a', // Base ID
            'Mon Application', // Name
            array('description' => 'Un widget pour intégrer mon application Flask.') // Args
        );
    }

    // Affichage du widget
    public function widget($args, $instance)
    {
        echo $args['before_widget'];
        if (!empty($instance['title'])) {
            echo $args['before_title'] . apply_filters('widget_title', $instance['title']) . $args['after_title'];
        }
        echo $args['after_widget'];
    }
}

// Enregistre les styles et les scripts du plugin.
function assistant1a_enqueue_styles()
{
    wp_enqueue_style('assistant1a-style', plugins_url('css/assistant-ai-1a-style.css', __FILE__));
    wp_enqueue_script('assistant1a-script', plugins_url('js/assistant-ai-1a.js', __FILE__), array('jquery'), false, true);
}
add_action('wp_enqueue_scripts', 'assistant1a_enqueue_styles');

// Enregistre le widget.
function register_assistant1a_widget()
{
    register_widget('Assistant1a_Widget');
}
add_action('widgets_init', 'register_assistant1a_widget');

// Définit le shortcode pour intégrer le formulaire dans les pages/posts.
function assistant1a_shortcode()
{
    ob_start(); // Commence la capture de sortie
    // HTML du formulaire
?>
    <div class="widget">
        <form id="assistant1a-form" enctype="multipart/form-data" method="post">

            <fieldset>
                <legend>Usages</legend>
                <div class="zone-radio">
                    <label><input type="radio" name="config" value="salarie" checked> Entretien salarié</label><br>
                    <label><input type="radio" name="config" value="direction"> Entretien direction</label><br>
                    <label><input type="radio" name="config" value="document"> Analyse documentaire</label><br>
                    <label><input type="radio" name="config" value="mp3"> MP3 vers Texte</label><br>
                    <label><input type="radio" name="config" value="discussion"> Discussion</label><br>
                </div>
            </fieldset>
            <div class="zone-ctrlFIcSess">

                <fieldset>
                    <legend>Gestion du fichier</legend>
                    <div id="assistant1a-file-section">
                        <input type="file" id="assistant1a-file" name="file" accept=".doc,.docx">
                        <button type="button" id="assistant1a-file-submit" class="custom-button">Envoyer le fichier</button>
                    </div>
                </fieldset>


                <fieldset>
                    <legend>Session utilisateur</legend>
                    <button type="button" id="assistant1a-reset" class="custom-button">Réinitialiser la Session</button>
                </fieldset>

            </div>

            <div class="zone-scrib">
                <!-- <input type="text" id="assistant1a-question" name="question" placeholder="Posez votre question ici..."> -->
                <button type="button" id="assistant1a-record" class="custom-button">
                    <img src="<?php echo plugins_url('assets/micro.png', __FILE__); ?>" alt="Micro">
                </button>
                <button type="button" id="assistant1a-stop" class="custom-button" style="display:none;">Arrêter</button>
                <textarea id="assistant1a-question" name="question" placeholder="Posez votre question ici..."></textarea>

                <!-- <button type="button" id="assistant1a-submit" class="custom-button">Demander</button> -->
                <button type="button" id="assistant1a-submit" class="custom-button">
                    <img src="<?php echo plugins_url('assets/sortie.png', __FILE__); ?>" alt="Demander">
                </button>


            </div>

            <div class="charger">
                <div id="assistant1a-file-upload-status" style="display:none;">
                    <div class="loader"></div>
                </div>
            </div>
            <div id="assistant1a-response"></div>
            <div id="response-actions" style="display:none;">
                <!-- Actions cachées par défaut -->
                <button id="copyButton">Copier l'échange</button>
                <button id="saveButton">Sauvegarder l'échange</button>

                <label>
                    <input type="checkbox" id="toggleHistoryCheckbox" unchecked>
                    Afficher l'historique
                </label>

            </div>


        </form>

        <div id="assistant1a-history"></div>
    </div>


<?php
    return ob_get_clean();
}
add_shortcode('assistant1a', 'assistant1a_shortcode');
