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
    wp_enqueue_style('dashboard-style', plugins_url('css/dashboard-style.css', __FILE__));
    wp_enqueue_script('assistant1a-script', plugins_url('js/assistant-ai-1a.js', __FILE__), array('jquery'), false, true);
    // Dans ton fichier PHP où tu enregistres ton script
    wp_enqueue_script('dashboard-script', plugins_url('js/dashboard.js', __FILE__), array('jquery'), false, true);
    wp_localize_script('dashboard-script', 'dashboardSettings', array(
        'baseUrl' => plugins_url('/', __FILE__)
    ));

    wp_enqueue_script('pdfjs', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.7.570/pdf.min.js', array(), null, true);
    wp_enqueue_script('pdfjs-worker', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.7.570/pdf.worker.min.js', array(), null, true);
    wp_enqueue_script('jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.3.1/jspdf.umd.min.js', array(), null, true);
    wp_enqueue_script('html2canvas', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.3.2/html2canvas.min.js', array(), null, true);
}

add_action('wp_enqueue_scripts', 'assistant1a_enqueue_styles');



function assistant1a_activate()
{
    // Chemin vers le fichier JSON dans le plugin
    $json_file = plugin_dir_path(__FILE__) . 'data/gpt_config.json';
    if (file_exists($json_file)) {
        // Charge le contenu du fichier JSON
        $data = file_get_contents($json_file);
        $configs = json_decode($data, true);

        if ($configs) {
            foreach ($configs as $key => $value) {
                update_option('assistant_ai_config_' . $key, $value);
            }
        }
    }
}
register_activation_hook(__FILE__, 'assistant1a_activate');


function load_config_callback()
{
    // Vérifier que l'utilisateur a le droit de faire cette action
    if (!current_user_can('manage_options')) {
        wp_send_json_error('Non autorisé');
        return;
    }

    $config_type = sanitize_text_field($_POST['configType']);
    $config = get_option('assistant_ai_config_' . $config_type);
    if ($config) {
        wp_send_json_success($config);
    } else {
        wp_send_json_error('Configuration non trouvée');
    }
}
add_action('wp_ajax_load_config', 'load_config_callback');



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

        <div class="zone-containRadio">

            <fieldset>
                <legend>Usages</legend>
                <div class="zone-radio">
                    <label><input type="radio" name="config" value="salarie" checked> Entretien salarié</label><br>
                    <label><input type="radio" name="config" value="direction"> Entretien direction</label><br>
                    <label><input type="radio" name="config" value="document"> Analyse documentaire</label><br>
                    <label><input type="radio" name="config" value="mp3"> Transcription audio</label><br>
                    <label><input type="radio" name="config" value="discussion"> Rédaction</label><br>

                </div>
                <div id="instructionText"></div>
            </fieldset>

        </div>
        <div class="zone-ctrlFIcSess">

            <fieldset>
                <legend>Gestion du fichier</legend>
                <div id="assistant1a-file-section">
                    <input type="file" id="assistant1a-file" name="file" accept=".doc,.docx,.pdf,.ppt,.pptx,.txt">
                    <button type="button" id="assistant1a-file-submit" class="custom-button">Envoyer le fichier</button>
                </div>
                <!-- Insertion du fieldset de l'estimation des coûts ici pour un affichage en ligne -->
                <fieldset id="cost-estimate-fieldset">
                    <legend>Estimation des coûts</legend>
                    <div id="cost-estimate-container">
                        <div class="details-container">
                            <div class="token-details">
                                <h3>Tokens</h3>
                                <p>Input: <span id="token-input">0</span></p>
                                <p>Output: <span id="token-output">0</span></p>
                                <p>Total: <span id="token-total">0</span></p>
                            </div>
                            <div class="cost-details">
                                <h3>Coût</h3>
                                <p><span id="cost-estimated">0.00</span></p>
                            </div>
                            <div class="quality-details">
                                <h3>Qualité</h3>
                                <p><span id="quality">N/A</span></p>
                                <!-- Ajout d'un élément pour afficher le nombre maximum de tokens -->
                                <p id="max-tokens-display" style="font-size: 0.8em; color: #666;">Max tokens: Non défini
                                </p>
                                <div id="token-progress-bar"
                                    style="width: 100%; background-color: #ddd; height: 24px; margin-top: 5px;">
                                    <div id="token-progress"
                                        style="height: 100%; width: 0%; background-color: #4CAF50;"></div>
                                </div>
                                <p id="token-status" style="font-size: 0.8em; margin-top: 5px; color: #666;">Statut des
                                    tokens non disponible</p>
                            </div>


                        </div>
                    </div>
                </fieldset>
            </fieldset>


            <fieldset>
                <legend>Session utilisateur</legend>
                <!-- <div id="assistant1a-session-section"> -->
                <button type="button" id="assistant1a-reset" class="custom-button">Réinitialiser la Session</button>
                <!-- </div> -->
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
        <!-- <div id="zone-session">
                <fieldset>
                    <legend>Session utilisateur</legend>
                    <button type="button" id="assistant1a-reset" class="custom-button">Réinitialiser la Session</button>
                </fieldset>
            </div> -->

        <div class="charger">

            <div id="loadingMessage" class="loading-message"></div>
            <div id="staticMessage" class="static-message">(En cas de problème lors du traitement, un message sera
                affiché ici.)</div>

            <div id="assistant1a-file-upload-status" style="display:none;">
                <div class="loader">
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                </div>

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