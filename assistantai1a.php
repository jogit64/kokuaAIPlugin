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
    var mode = 'text';

    recognition.onresult = function(event) {
        var text = event.results[0][0].transcript;
        document.getElementById('assistant1a-question').value = text;
        mode = 'voice';
        sendRequest();
    };

    recognition.onend = function() {
        document.getElementById('assistant1a-record').classList.remove('recording');
    };

    document.getElementById('assistant1a-record').addEventListener('click', function() {
        this.classList.add('recording');
        mode = 'voice';
        recognition.start();
    });

    document.getElementById('assistant1a-stop').addEventListener('click', function() {
        synth.cancel();
        this.style.display = 'none';
    });

    document.getElementById('assistant1a-question').addEventListener('input', function() {
        var submitButton = document.getElementById('assistant1a-submit');
        submitButton.disabled = this.value.length === 0;
        if (this.value.length > 0) {
            submitButton.classList.add('active');
        } else {
            submitButton.classList.remove('active');
        }
    });

    function sendRequest() {
        var formData = new FormData();
        var fileInput = document.getElementById('assistant1a-file');
        var questionInput = document.getElementById('assistant1a-question');
        var question = questionInput.value;
        var hasFile = fileInput.files.length > 0;
        var hasQuestion = question.length > 0;

        if (hasFile) {
            formData.append('file', fileInput.files[0]);
        }

        if (hasQuestion && !
            hasFile) { // Modification ici pour n'inclure la question que s'il n'y a pas de fichier
            formData.append('question', question);
        }

        if (!hasFile && !hasQuestion) {
            // Afficher un message d'erreur ou d'instruction ici si nécessaire
            return;
        }

        fetch('https://kokua060424-caea7e92447d.herokuapp.com/ask', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('assistant1a-response').innerHTML = data.response;
                if (mode === 'voice') {
                    speak(data.response);
                }
            })
            .catch(error => console.error('Error:', error));

        questionInput.value = '';
        fileInput.value = '';
    }

    document.getElementById('assistant1a-submit').addEventListener('click', sendRequest);
    document.getElementById('assistant1a-file-submit').addEventListener('click', sendRequest);

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