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


?>


<?php
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
<div id="assistant1a-form" style="display: flex; align-items: center;">
    <input type="text" id="assistant1a-question" placeholder="Posez votre question ici..." style="flex-grow: 1;">
    <button id="assistant1a-submit" disabled>Envoyer</button>
    <!-- Utilisation d'une icône pour le bouton (remplacez par votre propre icône) -->
    <button id="assistant1a-record">
        <img src="<?php echo plugins_url('assets/micro.png', __FILE__); ?>" alt="Micro">
    </button>
    <button id="assistant1a-stop" style="display:none;">Arrêter</button>
</div>

<div id="assistant1a-response"></div> <!-- Réponse affichée ici -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    var synth = window.speechSynthesis;
    var recognition = new(window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "fr-FR";
    recognition.continuous = false; // Ne pas continuer à écouter après la première reconnaissance
    var mode = 'text'; // Initialisation du mode à text

    recognition.onresult = function(event) {
        var text = event.results[0][0].transcript;
        document.getElementById('assistant1a-question').value = text;
        mode = 'voice'; // Mise à jour du mode à voice
        sendText(text);
    };

    recognition.onend = function() {
        document.getElementById('assistant1a-record').classList.remove('recording');
    };

    document.getElementById('assistant1a-record').addEventListener('click', function() {
        this.classList.add('recording');
        mode = 'voice';
        recognition.start();
    });

    document.getElementById('assistant1a-submit').addEventListener('click', function() {
        var question = document.getElementById('assistant1a-question').value;
        mode = 'text'; // Mise à jour du mode à text
        sendText(question);
    });

    document.getElementById('assistant1a-stop').addEventListener('click', function() {
        synth.cancel();
        this.style.display = 'none'; // Masquer le bouton stop
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

    function sendText(text) {
        fetch('https://kokua060424-caea7e92447d.herokuapp.com/ask', {

                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'question=' + encodeURIComponent(text),
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('assistant1a-response').innerHTML = '<p>' + data.response + '</p>';
                document.getElementById('assistant1a-question').value = ''; // Vide l'input
                var submitButton = document.getElementById('assistant1a-submit');
                submitButton.disabled = true; // Désactive le bouton
                submitButton.classList.remove(
                    'active'
                ); // S'assure que la classe 'active' est retirée pour revenir à la couleur bleue
                if (mode === 'voice') {
                    speak(data.response);
                }
            })
            .catch(error => console.error('Error:', error));
    }

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
    return ob_get_clean(); // Retourne le contenu capturé
}
add_shortcode('assistant1a', 'assistant1a_shortcode');