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
<form id="assistant1a-form" enctype="multipart/form-data" method="post">
    <div style="display: flex; width: 100%; align-items: center;">
        <input type="text" id="assistant1a-question" name="question" placeholder="Posez votre question ici..."
            style="flex-grow: 1; margin-right: 8px;">
        <button type="button" id="assistant1a-submit" disabled>Demander</button>
        <button type="button" id="assistant1a-record">
            <img src="<?php echo plugins_url('assets/micro.png', __FILE__); ?>" alt="Micro">
        </button>
        <button type="button" id="assistant1a-stop" style="display:none;">Arrêter</button>
    </div>

    <!-- Séparation claire de la section d'envoi de fichier -->
    <div id="assistant1a-file-section">
        <input type="file" id="assistant1a-file" name="file" accept=".doc,.docx">
        <button type="button" id="assistant1a-file-submit" class="not-active">Envoyer le fichier</button>
    </div>
</form>
<div id="assistant1a-response"></div> <!-- Réponse affichée ici -->


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
        var formData = new FormData();
        formData.append('question', text); // Ajoutez le texte de la question à FormData

        // Récupérez le fichier depuis l'input de fichier et ajoutez-le à FormData
        var fileInput = document.getElementById('assistant1a-file');
        if (fileInput.files.length > 0) {
            formData.append('file', fileInput.files[0]); // Ajoute le fichier sélectionné
        }

        fetch('https://kokua060424-caea7e92447d.herokuapp.com/ask', {
                method: 'POST',
                body: formData, // Utilisez FormData ici
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                // Traitement de la réponse, comme avant
                const cleanHTML = DOMPurify.sanitize(data.response);
                document.getElementById('assistant1a-response').innerHTML = cleanHTML;

                // Réinitialiser l'input de la question et le champ de fichier après l'envoi
                document.getElementById('assistant1a-question').value = ''; // Vide l'input de la question
                document.getElementById('assistant1a-file').value = ''; // Vide l'input du fichier
                var submitButton = document.getElementById('assistant1a-submit');
                submitButton.disabled = true; // Désactive le bouton Envoyer
                submitButton.classList.remove(
                    'active'); // Retire la classe active, si vous l'utilisez pour le style
                if (mode === 'voice') {
                    speak(data.response); // Lance la synthèse vocale si le mode voix est actif
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

// Gestion de l'envoi de fichier séparée
document.getElementById('assistant1a-file-submit').addEventListener('click', function() {
    var fileInput = document.getElementById('assistant1a-file');
    if (fileInput.files.length > 0) {
        var formData = new FormData();
        formData.append('file', fileInput.files[0]);
        document.getElementById('assistant1a-file-upload-status').style.display =
            'block'; // Afficher l'indicateur de chargement
        fetch('URL_DE_VOTRE_SERVEUR', { // Remplacez par l'URL de votre serveur
                method: 'POST',
                body: formData,
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                // Gérer le succès de l'upload ici
                document.getElementById('assistant1a-file-upload-status').style.display =
                    'none'; // Masquer l'indicateur de chargement
                document.getElementById('assistant1a-file').value = ''; // Réinitialiser le champ de fichier
                document.getElementById('assistant1a-file-submit').style.backgroundColor =
                    'green'; // Changer la couleur du bouton
                document.getElementById('assistant1a-file-submit').innerText =
                    'Fichier envoyé'; // Modifier le texte du bouton
            })
            .catch(error => {
                console.error('Error:', error);
                document.getElementById('assistant1a-file-upload-status').style.display =
                    'none'; // Masquer en cas d'erreur
            });
    }
});
</script>
<?php
    return ob_get_clean(); // Retourne le contenu capturé
}
add_shortcode('assistant1a', 'assistant1a_shortcode');