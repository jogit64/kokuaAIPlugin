<?php

/**
 * Plugin Name: Assistant-ai-1a
 * Description: Un widget personnalisé pour intégrer mon application Flask.
 * Version: 1.0 - IA base 050424
 * Author: johannr.fr
 */

class Assistant1a_Widget extends WP_Widget
{
    public function __construct()
    {
        parent::__construct(
            'assistant1a', // Base ID
            'Mon Application', // Name
            array('description' => 'Un widget pour intégrer mon application Flask.') // Args
        );
    }

    public function widget($args, $instance)
    {
        echo $args['before_widget'];
        if (!empty($instance['title'])) {
            echo $args['before_title'] . apply_filters('widget_title', $instance['title']) . $args['after_title'];
        }
        echo $args['after_widget'];
    }
}

function assistant1a_enqueue_styles()
{
    wp_enqueue_style('assistant1a-style', plugins_url('assistant-ai-1a-style.css', __FILE__));
}
add_action('wp_enqueue_scripts', 'assistant1a_enqueue_styles');

function register_assistant1a_widget()
{
    register_widget('Assistant1a_Widget');
}
add_action('widgets_init', 'register_assistant1a_widget');

function assistant1a_shortcode()
{
    ob_start(); // Commence la capture de sortie
?>
<form id="assistant1a-form" enctype="multipart/form-data" method="post">
    <div style="display: flex; width: 100%; align-items: center;">
        <input type="text" id="assistant1a-question" name="question" placeholder="Posez votre question ici..."
            style="flex-grow: 1; margin-right: 8px;">
        <button type="button" id="assistant1a-submit">Demander</button>
        <button type="button" id="assistant1a-record">
            <img src="<?php echo plugins_url('assets/micro.png', __FILE__); ?>" alt="Micro">
        </button>
        <button type="button" id="assistant1a-stop" style="display:none;">Arrêter</button>
    </div>

    <div id="assistant1a-file-section">
        <input type="file" id="assistant1a-file" name="file" accept=".doc,.docx">
        <button type="button" id="assistant1a-file-submit">Envoyer le fichier</button>
    </div>
    <div id="assistant1a-file-upload-status" style="display:none;">Chargement en cours...</div>
</form>
<div id="assistant1a-response"></div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    var synth = window.speechSynthesis;
    var recognition = new(window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "fr-FR";
    recognition.continuous = false;

    // Pour distinguer si la dernière action était la reconnaissance vocale
    var lastActionWasVoice = false;

    var submitButton = document.getElementById('assistant1a-submit');
    var fileSubmitButton = document.getElementById('assistant1a-file-submit');
    var fileInput = document.getElementById('assistant1a-file');
    var questionInput = document.getElementById('assistant1a-question');
    var loadingIndicator = document.getElementById('assistant1a-file-upload-status');
    var responseContainer = document.getElementById('assistant1a-response');

    function updateButtonStyles() {
        var hasFile = fileInput.files.length > 0;
        var hasText = questionInput.value.trim().length > 0;

        submitButton.disabled = !hasText;
        fileSubmitButton.disabled = !hasFile;

        submitButton.classList.toggle('active', hasText);
        fileSubmitButton.classList.toggle('active', hasFile);
    }

    recognition.onresult = function(event) {
        lastActionWasVoice = true;
        var text = event.results[0][0].transcript;
        questionInput.value = text;
        updateButtonStyles();
        sendRequest();
    };

    recognition.onend = function() {
        document.getElementById('assistant1a-record').classList.remove('recording');
    };

    document.getElementById('assistant1a-record').addEventListener('click', function() {
        this.classList.add('recording');
        recognition.start();
    });

    document.getElementById('assistant1a-stop').addEventListener('click', function() {
        synth.cancel();
        this.style.display = 'none';
    });

    questionInput.addEventListener('input', updateButtonStyles);
    fileInput.addEventListener('change', updateButtonStyles);

    function sendRequest() {
        loadingIndicator.style.display = 'block';
        var formData = new FormData();
        if (fileInput.files.length > 0) {
            formData.append('file', fileInput.files[0]);
        }
        if (questionInput.value.trim().length > 0) {
            formData.append('question', questionInput.value.trim());
        }

        fetch('https://kokua060424-caea7e92447d.herokuapp.com/ask', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                responseContainer.innerHTML = data.response;
                // Active la synthèse vocale uniquement si la dernière action était la reconnaissance vocale
                if (lastActionWasVoice) {
                    speak(data.response);
                    lastActionWasVoice = false; // Réinitialise après avoir parlé
                }
            })
            .catch(error => {
                console.error('Error:', error);
                responseContainer.innerHTML = "Erreur lors de la requête.";
            })
            .finally(() => {
                loadingIndicator.style.display = 'none';
                questionInput.value = '';
                fileInput.value = '';
                updateButtonStyles();
            });
    }

    submitButton.addEventListener('click', function() {
        lastActionWasVoice = false; // Réinitialise pour les demandes textuelles
        sendRequest();
    });
    fileSubmitButton.addEventListener('click', sendRequest);

    function speak(text) {
        var utterThis = new SpeechSynthesisUtterance(text);
        synth.speak(utterThis);
        document.getElementById('assistant1a-stop').style.display = 'block';
        utterThis.onend = function() {
            document.getElementById('assistant1a-stop').style.display = 'none';
        };
    }
});
</script>

<?php
    return ob_get_clean();
}
add_shortcode('assistant1a', 'assistant1a_shortcode');